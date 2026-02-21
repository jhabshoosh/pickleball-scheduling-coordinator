import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Poll } from 'shared/types';

export function useCurrentPoll() {
  return useQuery<Poll>({
    queryKey: ['currentPoll'],
    queryFn: api.getCurrentPoll,
    retry: false,
  });
}
