import { notifyManager } from '@tanstack/react-query'
import { act, configure } from '@testing-library/react'

configure({ reactStrictMode: true })

// Wrap notifications with act to make sure React knows about React Query updates
notifyManager.setNotifyFunction((fn) => {
	act(fn)
})
