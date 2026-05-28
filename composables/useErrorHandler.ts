export interface ErrorHandlerOptions {
  fallbackMessage?: string
  onError?: (error: Error) => void
}

export interface ErrorHandlerState {
  error: Error | null
  isError: ComputedRef<boolean>
  errorMessage: ComputedRef<string>
}

export interface ErrorHandlerActions {
  handleError: (error: unknown, options?: ErrorHandlerOptions) => void
  clearError: () => void
  wrapAsync: <T>(promise: Promise<T>, options?: ErrorHandlerOptions) => Promise<T | null>
}

export const useErrorHandler = (defaultOptions?: ErrorHandlerOptions): ErrorHandlerState & ErrorHandlerActions => {
  const state = reactive({
    error: null as Error | null
  })

  const isError = computed(() => state.error !== null)
  
  const errorMessage = computed(() => {
    if (!state.error) return ''
    return state.error.message || '未知错误'
  })

  const handleError = (error: unknown, options: ErrorHandlerOptions = {}): void => {
    const opts = { 
      fallbackMessage: '操作失败，请稍后重试',
      ...defaultOptions,
      ...options 
    }

    const normalizedError = error instanceof Error 
      ? error 
      : new Error(typeof error === 'string' ? error : opts.fallbackMessage)

    state.error = normalizedError

    if (opts.onError) {
      opts.onError(normalizedError)
    }
  }

  const clearError = (): void => {
    state.error = null
  }

  const wrapAsync = async <T>(
    promise: Promise<T>, 
    options: ErrorHandlerOptions = {}
  ): Promise<T | null> => {
    try {
      clearError()
      return await promise
    } catch (error) {
      handleError(error, options)
      return null
    }
  }

  return {
    error: readonly(state.error),
    isError,
    errorMessage,
    handleError,
    clearError,
    wrapAsync
  }
}

export const useComponentError = (fallbackMessage?: string) => {
  const { error, isError, errorMessage, handleError, clearError, wrapAsync } = useErrorHandler({
    fallbackMessage: fallbackMessage || '加载失败'
  })

  const retry = async (retryFn: () => Promise<void>): Promise<void> => {
    clearError()
    await wrapAsync(retryFn())
  }

  return {
    error: readonly(error),
    isError,
    errorMessage,
    handleError,
    clearError,
    wrapAsync,
    retry
  }
}
