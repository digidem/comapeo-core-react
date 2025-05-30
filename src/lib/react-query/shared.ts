import type {
	QueryOptions,
	UseMutationOptions,
} from '@tanstack/react-query' with { 'resolution-mode': 'import' }

export const ROOT_QUERY_KEY = '@comapeo/core-react'

// Since the API is running locally, queries should run regardless of network
// status, and should not be retried. In React Native the API consumer would
// have to manually set the network mode, but we still should keep these options
// to avoid surprises. Not using the queryClient `defaultOptions` because the API
// consumer might also use the same queryClient for network queries
export function baseQueryOptions() {
	return {
		networkMode: 'always',
		retry: false,
	} satisfies QueryOptions
}

export function baseMutationOptions() {
	return {
		networkMode: 'always',
		retry: false,
	} satisfies UseMutationOptions
}
