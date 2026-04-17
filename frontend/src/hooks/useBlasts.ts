import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { BlastCampaign, ApiSuccess } from '@/types';

interface CreateBlastInput {
  name: string;
  templateName: string;
  templateParams?: Record<string, string>;
  audience: string;
  scheduledAt?: string;
}

export function useBlasts() {
  return useQuery({
    queryKey: ['blasts'],
    queryFn: () => api.get<ApiSuccess<BlastCampaign[]>>('/blasts').then((r) => r.data),
  });
}

export function useCreateBlast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBlastInput) =>
      api.post<ApiSuccess<BlastCampaign>>('/blasts', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blasts'] }),
  });
}

export function useSendBlast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/blasts/${id}/send`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blasts'] }),
  });
}

export function useDeleteBlast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/blasts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blasts'] }),
  });
}
