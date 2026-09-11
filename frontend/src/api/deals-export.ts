import { api } from './client'

/** Download only after the entire authenticated response has been received successfully. */
export async function downloadDealsCsv(): Promise<void> {
  const blob = await api.csv('/deals/export.csv')
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'deals.csv'
  document.body.append(anchor)
  try {
    anchor.click()
  } finally {
    anchor.remove()
    // Let the browser consume the URL before releasing its backing storage.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
