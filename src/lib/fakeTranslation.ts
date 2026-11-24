// Fake "translation" for testing the whole pipeline without paying OpenAI.
const LINES = [
  'To be, or not to be, that is the question.',
  'All the world is a stage, and all the men and women merely players.',
  'The lady doth protest too much, methinks.',
  'Parting is such sweet sorrow, that I shall say good night till it be morrow.',
  'We are such stuff as dreams are made on.',
]

const WORD_MS = 150
const LINE_PAUSE_MS = 1200

export function startFakeStream(onDelta: (d: string) => void): () => void {
  let lineIndex = 0
  let words: string[] = []
  let wordIndex = 0
  let timer: ReturnType<typeof setTimeout>

  function tick() {
    if (wordIndex === 0) words = LINES[lineIndex].split(' ')
    // Real deltas carry their own leading space, except the first word of a line.
    onDelta(wordIndex === 0 ? words[0] : ' ' + words[wordIndex])
    wordIndex++
    if (wordIndex >= words.length) {
      wordIndex = 0
      lineIndex = (lineIndex + 1) % LINES.length
      // Pause, then a line break (or space) before the next line.
      timer = setTimeout(() => {
        onDelta(lineIndex % 2 === 0 ? '\n' : ' ')
        tick()
      }, LINE_PAUSE_MS)
    } else {
      timer = setTimeout(tick, WORD_MS)
    }
  }

  timer = setTimeout(tick, WORD_MS)
  return () => clearTimeout(timer)
}
