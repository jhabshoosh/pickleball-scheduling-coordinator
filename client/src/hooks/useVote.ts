import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Vote, SubmitVoteRequest } from 'shared/types';

export function useVote(pollId: number | undefined, playerId: number | undefined) {
  const queryClient = useQueryClient();

  const voteQuery = useQuery<Vote>({
    queryKey: ['vote', pollId, playerId],
    queryFn: () => api.getVote(pollId!, playerId!),
    enabled: !!pollId && !!playerId,
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: (data: SubmitVoteRequest) => api.submitVote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vote', pollId, playerId] });
      queryClient.invalidateQueries({ queryKey: ['pollVotes', pollId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteVote(pollId!, playerId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vote', pollId, playerId] });
      queryClient.invalidateQueries({ queryKey: ['pollVotes', pollId] });
    },
  });

  return {
    vote: voteQuery.data,
    isLoading: voteQuery.isLoading,
    submitVote: submitMutation.mutateAsync,
    deleteVote: deleteMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
  };
}

export function usePollVotes(pollId: number | undefined) {
  return useQuery({
    queryKey: ['pollVotes', pollId],
    queryFn: () => api.getPollVotes(pollId!),
    enabled: !!pollId,
  });
}
