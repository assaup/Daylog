import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import type {
  Category,
  CategoryPreset,
  DayLog,
  EntryDraft,
  StatsResponse,
  TimeEntry,
} from '@/types';

import { api } from './client';

// --- Categories ---
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get<Category[]>('/categories/')).data,
  });
}

export function useCategoryPresets() {
  return useQuery({
    queryKey: ['category-presets'],
    queryFn: async () => (await api.get<CategoryPreset[]>('/categories/presets/')).data,
    staleTime: Infinity,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Category>) =>
      (await api.post<Category>('/categories/', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Category> & { id: number }) =>
      (await api.patch<Category>(`/categories/${id}/`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/categories/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useEditCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      mode,
      ...payload
    }: Partial<Category> & { id: number; mode: 'all' | 'new' }) =>
      (await api.post<Category>(`/categories/${id}/edit/`, { ...payload, mode })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['entries'] });
    },
  });
}

// --- Entries ---
export function useDayEntries(date: string) {
  return useQuery({
    queryKey: ['entries', date],
    queryFn: async () =>
      (await api.get<TimeEntry[]>('/entries/', { params: { date } })).data,
  });
}

export function useSaveDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ date, entries }: { date: string; entries: EntryDraft[] }) =>
      (await api.post<TimeEntry[]>('/entries/bulk/', { date, entries })).data,
    onSuccess: (_data, { date }) => {
      qc.invalidateQueries({ queryKey: ['entries', date] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

// --- Day log (wake / sleep) ---
export function useDayLog(date: string) {
  return useQuery({
    queryKey: ['daylog', date],
    queryFn: async () => (await api.get<DayLog>('/day/', { params: { date } })).data,
  });
}

type DayLogInput = { date: string; wake_time?: string | null; sleep_time?: string | null };

export function useSaveDayLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: DayLogInput) => (await api.put<DayLog>('/day/', payload)).data,
    onSuccess: (_data, payload) => {
      qc.invalidateQueries({ queryKey: ['daylog', payload.date] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

// --- Stats ---
export function useStats(from: string, to: string, goal = 0) {
  return useQuery({
    queryKey: ['stats', from, to, goal],
    queryFn: async () =>
      (await api.get<StatsResponse>('/stats/', { params: { from, to, goal } })).data,
    placeholderData: keepPreviousData,
  });
}
