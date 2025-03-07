import { notifyManager } from '@tanstack/react-query'
import { act, cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
	// https://testing-library.com/docs/react-testing-library/api#cleanup
	cleanup()
})

// Wrap notifications with act to make sure React knows about React Query updates
notifyManager.setNotifyFunction((fn) => {
	act(fn)
})
