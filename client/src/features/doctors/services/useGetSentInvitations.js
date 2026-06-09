import { getSentInvitationsApi } from "@/services/invitationApi";
import { useQuery } from "@tanstack/react-query";

export function useGetSentInvitations() {
    const { data, isPending } = useQuery({
        queryFn: () => getSentInvitationsApi(),
        queryKey: ["sentInvitations"],
    });

    return {
        invitations: data ?? [],
        isLoading: isPending,
    };
}
