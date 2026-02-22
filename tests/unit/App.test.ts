/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import App from '../../src/App.svelte'

describe('App', () => {
    it('renders without crashing', () => {
        render(App)
        // Adjust based on a real known string in Nomina's app startup
        expect(document.body).toBeInTheDocument()
    })
})
