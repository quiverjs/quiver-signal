export const testError = message => {
  const err = new Error(message)
  err.isTestError = true
  return err
}
