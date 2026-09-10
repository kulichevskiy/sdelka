import { useState } from 'react'
import { Mail, MessageSquare, Phone, StickyNote, Users } from 'lucide-react'
import type { Activity, ActivityDraft, ActivityType, User } from '../types'
import { formatDate, initialsOf, userById } from './contacts-utils'

interface ActivityFeedProps {
  activities: Activity[]
  users: User[]
  today: string
  /** Показывать, с кем именно был разговор — нужно в ленте компании */
  contactNameOf?: (contactId: string | null) => string | undefined
  onLogActivity?: (activity: ActivityDraft) => void
}

const activityIcons: Record<ActivityType, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  note: StickyNote,
}

const activityLabels: Record<ActivityType, string> = {
  call: 'Звонок',
  email: 'Письмо',
  meeting: 'Встреча',
  note: 'Заметка',
}

export function ActivityFeed({
  activities,
  users,
  today,
  contactNameOf,
  onLogActivity,
}: ActivityFeedProps) {
  const [type, setType] = useState<ActivityType>('call')
  const [note, setNote] = useState('')

  function submit() {
    if (!note.trim()) return
    onLogActivity?.({ type, note: note.trim() })
    setNote('')
  }

  return (
    <div>
      <div className="rounded-lg border border-stone-200 p-2 dark:border-stone-800">
        <div className="flex gap-1">
          {(Object.keys(activityLabels) as ActivityType[]).map((option) => {
            const Icon = activityIcons[option]
            const isActive = type === option
            return (
              <button
                key={option}
                type="button"
                onClick={() => setType(option)}
                className={[
                  'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-stone-200 text-stone-900 dark:bg-stone-800 dark:text-stone-100'
                    : 'text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800',
                ].join(' ')}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {activityLabels[option]}
              </button>
            )
          })}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && submit()}
            placeholder="Что произошло?"
            aria-label="Текст активности"
            className="flex-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-500/20 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
          />
          <button
            type="button"
            onClick={submit}
            className="shrink-0 rounded-lg border border-stone-200 px-3 text-sm font-medium text-stone-700 transition-all duration-150 hover:bg-stone-100 active:scale-95 dark:border-stone-800 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Записать
          </button>
        </div>
      </div>

      <ol className="mt-3 flex flex-col">
        {activities.map((activity, index) => {
          const Icon = activityIcons[activity.type]
          const author = userById(users, activity.authorId)
          const withWhom = contactNameOf?.(activity.contactId)
          const isLast = index === activities.length - 1

          return (
            <li key={activity.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500 dark:bg-stone-900 dark:text-stone-400">
                  <Icon className="size-3.5" aria-hidden="true" />
                </span>
                {!isLast && <span className="w-px flex-1 bg-stone-200 dark:bg-stone-800" />}
              </div>
              <div className="min-w-0 flex-1 pb-4">
                <p className="flex flex-wrap items-baseline gap-x-2 text-xs text-stone-400 dark:text-stone-500">
                  <span className="font-medium text-stone-600 dark:text-stone-300">
                    {activityLabels[activity.type]}
                  </span>
                  {withWhom && <span className="text-stone-500 dark:text-stone-400">{withWhom}</span>}
                  <span className="tabular-nums">{formatDate(activity.date, today)}</span>
                  {author && (
                    <span className="flex items-center gap-1">
                      <span className="flex size-4 items-center justify-center rounded-full bg-stone-200 text-[8px] font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                        {initialsOf(author.name)}
                      </span>
                      {author.name}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                  {activity.note}
                </p>
              </div>
            </li>
          )
        })}

        {activities.length === 0 && (
          <li className="flex items-center gap-2 py-3 text-xs text-stone-400 dark:text-stone-600">
            <MessageSquare className="size-4" aria-hidden="true" />
            Взаимодействий пока не было
          </li>
        )}
      </ol>
    </div>
  )
}
