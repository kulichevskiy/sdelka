import { useMutation } from '@tanstack/react-query'
import { downloadDealsCsv } from '@/api/deals-export'
import { Alert, Button } from '@/components/ui'

export function ExportDealsButton() {
  const exportCsv = useMutation({ mutationFn: downloadDealsCsv })
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" loading={exportCsv.isPending} onClick={() => exportCsv.mutate()}>
        скачать как csv
      </Button>
      {exportCsv.isError && (
        <Alert>Не удалось скачать сделки. {exportCsv.error.message} Попробуйте ещё раз.</Alert>
      )}
    </div>
  )
}
