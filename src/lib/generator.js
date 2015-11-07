export const generatorObserver = generator => {
  const observer = generator()
  observer.next()
  return observer
}

export const subscribeGenerator = function(generator) {
  return this.subscribe(generatorObserver(generator))
}
