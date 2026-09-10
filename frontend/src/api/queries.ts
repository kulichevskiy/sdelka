/**
 * Серверное состояние: по хуку на ресурс плюс мутации.
 * Оптимистичные обновления только там, где задержка ощущается руками:
 * перенос карточки, отметка задачи, перенос срока, порядок стадий.
 * Остальное просто инвалидирует кэш — данных в организации мало, перезапрос дёшев.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { api } from './client'
import type {
  Activity,
  ActivityCreate,
  Company,
  CompanyPatch,
  Contact,
  ContactPatch,
  Currency,
  CustomField,
  CustomFieldCreate,
  Deal,
  DealCreate,
  DealMove,
  DealPatch,
  InviteResult,
  LossReason,
  Me,
  Onboarding,
  Org,
  Role,
  Stage,
  Task,
  TaskPatch,
  User,
  UserStatus,
} from './types'

export const keys = {
  me: ['me'] as const,
  users: ['users'] as const,
  stages: ['stages'] as const,
  companies: ['companies'] as const,
  contacts: ['contacts'] as const,
  deals: ['deals'] as const,
  tasks: ['tasks'] as const,
  activities: ['activities'] as const,
  customFields: ['custom-fields'] as const,
  lossReasons: ['loss-reasons'] as const,
}

const list =
  <T>(key: readonly string[], path: string) =>
  (options?: Partial<UseQueryOptions<T[]>>) =>
    useQuery<T[]>({ queryKey: key, queryFn: () => api.get<T[]>(path), ...options })

export const useUsers = list<User>(keys.users, '/users')
export const useStages = list<Stage>(keys.stages, '/stages')
export const useCompanies = list<Company>(keys.companies, '/companies')
export const useContacts = list<Contact>(keys.contacts, '/contacts')
export const useDeals = list<Deal>(keys.deals, '/deals')
export const useTasks = list<Task>(keys.tasks, '/tasks')
export const useActivities = list<Activity>(keys.activities, '/activities')
export const useCustomFields = list<CustomField>(keys.customFields, '/custom-fields')
export const useLossReasons = list<LossReason>(keys.lossReasons, '/loss-reasons')

export function useMe(enabled = true) {
  return useQuery<Me>({
    queryKey: keys.me,
    queryFn: () => api.get<Me>('/auth/me'),
    enabled,
    retry: false,
    staleTime: 60_000,
  })
}

/** Онбординг зависит от данных, поэтому после «первых действий» пересчитываем me */
function invalidateMe(client: QueryClient) {
  return client.invalidateQueries({ queryKey: keys.me })
}

function patchList<T extends { id: string }>(items: T[] | undefined, id: string, patch: Partial<T>): T[] | undefined {
  return items?.map((item) => (item.id === id ? { ...item, ...patch } : item))
}

// ---- Сделки ----

export function useCreateDeal() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: DealCreate) => api.post<Deal>('/deals', body),
    onSuccess: (deal) => {
      client.setQueryData<Deal[]>(keys.deals, (deals) => [deal, ...(deals ?? [])])
      invalidateMe(client)
    },
  })
}

export function useUpdateDeal() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: DealPatch }) =>
      api.patch<Deal>(`/deals/${id}`, patch),
    // Правка полей в панели идёт на каждый символ: без оптимизма поле «дёргается»
    onMutate: async ({ id, patch }) => {
      await client.cancelQueries({ queryKey: keys.deals })
      const previous = client.getQueryData<Deal[]>(keys.deals)
      client.setQueryData<Deal[]>(keys.deals, (deals) => patchList<Deal>(deals, id, patch))
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) client.setQueryData(keys.deals, context.previous)
    },
    onSettled: () => client.invalidateQueries({ queryKey: keys.deals }),
  })
}

export function useMoveDeal() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: DealMove & { id: string }) =>
      api.post<Deal>(`/deals/${id}/move`, body),
    onMutate: async ({ id, stageId, outcome, lostReason }) => {
      await client.cancelQueries({ queryKey: keys.deals })
      const previous = client.getQueryData<Deal[]>(keys.deals)
      client.setQueryData<Deal[]>(keys.deals, (deals) =>
        patchList<Deal>(deals, id, {
          stageId,
          outcome: outcome ?? null,
          lostReason: lostReason ?? null,
        }),
      )
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) client.setQueryData(keys.deals, context.previous)
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: keys.deals })
      client.invalidateQueries({ queryKey: keys.lossReasons })
    },
  })
}

export function useDeleteDeal() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/deals/${id}`),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: keys.deals })
      client.invalidateQueries({ queryKey: keys.tasks })
      client.invalidateQueries({ queryKey: keys.activities })
    },
  })
}

// ---- Задачи ----

export function useCreateTask() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { dealId: string; title: string; dueDate: string; assigneeId?: string }) =>
      api.post<Task>('/tasks', body),
    onSuccess: (task) => {
      client.setQueryData<Task[]>(keys.tasks, (tasks) => [...(tasks ?? []), task])
      invalidateMe(client)
    },
  })
}

export function useUpdateTask() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TaskPatch }) =>
      api.patch<Task>(`/tasks/${id}`, patch),
    onMutate: async ({ id, patch }) => {
      await client.cancelQueries({ queryKey: keys.tasks })
      const previous = client.getQueryData<Task[]>(keys.tasks)
      client.setQueryData<Task[]>(keys.tasks, (tasks) => patchList<Task>(tasks, id, patch))
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) client.setQueryData(keys.tasks, context.previous)
    },
    onSettled: () => client.invalidateQueries({ queryKey: keys.tasks }),
  })
}

// ---- Активности ----

export function useCreateActivity() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: ActivityCreate) => api.post<Activity>('/activities', body),
    onSuccess: (activity) =>
      client.setQueryData<Activity[]>(keys.activities, (items) => [...(items ?? []), activity]),
  })
}

// ---- Компании и контакты ----

export function useCreateCompany() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string } & CompanyPatch) => api.post<Company>('/companies', body),
    onSuccess: (company) => {
      client.setQueryData<Company[]>(keys.companies, (items) => [company, ...(items ?? [])])
    },
  })
}

export function useUpdateCompany() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: CompanyPatch }) =>
      api.patch<Company>(`/companies/${id}`, patch),
    onMutate: async ({ id, patch }) => {
      await client.cancelQueries({ queryKey: keys.companies })
      const previous = client.getQueryData<Company[]>(keys.companies)
      client.setQueryData<Company[]>(keys.companies, (items) => patchList<Company>(items, id, patch))
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) client.setQueryData(keys.companies, context.previous)
    },
    onSettled: () => client.invalidateQueries({ queryKey: keys.companies }),
  })
}

export function useCreateContact() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; companyId: string } & ContactPatch) =>
      api.post<Contact>('/contacts', body),
    onSuccess: (contact) => {
      client.setQueryData<Contact[]>(keys.contacts, (items) => [contact, ...(items ?? [])])
      invalidateMe(client)
    },
  })
}

export function useUpdateContact() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ContactPatch }) =>
      api.patch<Contact>(`/contacts/${id}`, patch),
    onMutate: async ({ id, patch }) => {
      await client.cancelQueries({ queryKey: keys.contacts })
      const previous = client.getQueryData<Contact[]>(keys.contacts)
      client.setQueryData<Contact[]>(keys.contacts, (items) => patchList<Contact>(items, id, patch))
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) client.setQueryData(keys.contacts, context.previous)
    },
    onSettled: () => client.invalidateQueries({ queryKey: keys.contacts }),
  })
}

// ---- Стадии ----

export function useStageMutations() {
  const client = useQueryClient()
  const refresh = () => {
    client.invalidateQueries({ queryKey: keys.stages })
    invalidateMe(client)
  }

  const add = useMutation({
    mutationFn: (name: string) => api.post<Stage>('/stages', { name }),
    onSuccess: refresh,
  })
  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch<Stage>(`/stages/${id}`, { name }),
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: ({ id, moveTo }: { id: string; moveTo?: string }) =>
      api.delete(`/stages/${id}${moveTo ? `?moveTo=${moveTo}` : ''}`),
    onSuccess: () => {
      refresh()
      client.invalidateQueries({ queryKey: keys.deals })
    },
  })
  const reorder = useMutation({
    mutationFn: (ids: string[]) => api.put<Stage[]>('/stages/order', { ids }),
    onMutate: async (ids) => {
      await client.cancelQueries({ queryKey: keys.stages })
      const previous = client.getQueryData<Stage[]>(keys.stages)
      client.setQueryData<Stage[]>(keys.stages, (stages) =>
        stages?.map((stage) => ({ ...stage, order: ids.indexOf(stage.id) + 1 })),
      )
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) client.setQueryData(keys.stages, context.previous)
    },
    onSettled: refresh,
  })

  return { add, rename, remove, reorder }
}

// ---- Пользователи ----

export function useUserMutations() {
  const client = useQueryClient()
  const refresh = () => {
    client.invalidateQueries({ queryKey: keys.users })
    invalidateMe(client)
  }

  const invite = useMutation({
    mutationFn: (body: { email: string; role: Exclude<Role, 'owner'> }) =>
      api.post<InviteResult>('/users/invite', body),
    onSuccess: refresh,
  })
  const resendInvite = useMutation({
    mutationFn: (id: string) => api.post<{ inviteUrl: string }>(`/users/${id}/resend-invite`),
  })
  const resetLink = useMutation({
    mutationFn: (id: string) => api.post<{ resetUrl: string }>(`/users/${id}/reset-link`),
  })
  const update = useMutation({
    mutationFn: ({
      id,
      ...patch
    }: {
      id: string
      role?: Exclude<Role, 'owner'>
      status?: Exclude<UserStatus, 'invited'>
    }) => api.patch<User>(`/users/${id}`, patch),
    onSuccess: refresh,
  })
  const transferOwnership = useMutation({
    mutationFn: (id: string) => api.post(`/users/${id}/transfer-ownership`),
    onSuccess: refresh,
  })
  const cancelInvite = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: refresh,
  })

  return { invite, resendInvite, resetLink, update, transferOwnership, cancelInvite }
}

// ---- Настройки ----

export function useCustomFieldMutations() {
  const client = useQueryClient()
  const refresh = () => client.invalidateQueries({ queryKey: keys.customFields })
  const add = useMutation({
    mutationFn: (body: CustomFieldCreate) => api.post<CustomField>('/custom-fields', body),
    onSuccess: refresh,
  })
  const update = useMutation({
    mutationFn: ({
      id,
      ...patch
    }: {
      id: string
      name?: string
      isRequired?: boolean
      options?: string[]
    }) => api.patch<CustomField>(`/custom-fields/${id}`, patch),
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/custom-fields/${id}`),
    onSuccess: refresh,
  })
  return { add, update, remove }
}

export function useLossReasonMutations() {
  const client = useQueryClient()
  const refresh = () => {
    client.invalidateQueries({ queryKey: keys.lossReasons })
    client.invalidateQueries({ queryKey: keys.deals })
  }
  const add = useMutation({
    mutationFn: (name: string) => api.post<LossReason>('/loss-reasons', { name }),
    onSuccess: refresh,
  })
  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch<LossReason>(`/loss-reasons/${id}`, { name }),
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/loss-reasons/${id}`),
    onSuccess: refresh,
  })
  return { add, rename, remove }
}

// ---- Организация ----

export function useOrgMutations() {
  const client = useQueryClient()
  const refreshAll = () => client.invalidateQueries()

  const update = useMutation({
    mutationFn: (body: { name?: string; currency?: Currency }) => api.patch<Org>('/org', body),
    onSuccess: () => invalidateMe(client),
  })
  const dismissOnboarding = useMutation({
    mutationFn: () => api.post<Onboarding>('/org/onboarding/dismiss'),
    onSuccess: (onboarding) =>
      client.setQueryData<Me>(keys.me, (me) => (me ? { ...me, onboarding } : me)),
  })
  const loadDemo = useMutation({
    mutationFn: () => api.post('/org/demo-data'),
    onSuccess: refreshAll,
  })
  const clearDemo = useMutation({
    mutationFn: () => api.delete('/org/demo-data'),
    onSuccess: refreshAll,
  })
  return { update, dismissOnboarding, loadDemo, clearDemo }
}

// ---- Auth ----

export function useAuthMutations() {
  const client = useQueryClient()
  const setMe = (me: Me) => client.setQueryData(keys.me, me)

  const login = useMutation({
    mutationFn: (body: { email: string; password: string }) => api.post<Me>('/auth/login', body),
    onSuccess: setMe,
  })
  const register = useMutation({
    mutationFn: (body: import('./types').RegisterBody) => api.post<Me>('/auth/register', body),
    onSuccess: setMe,
  })
  const acceptInvite = useMutation({
    mutationFn: (body: { token: string; name: string; password: string }) =>
      api.post<Me>('/auth/accept-invite', body),
    onSuccess: setMe,
  })
  const logout = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => client.clear(),
  })
  const updateProfile = useMutation({
    mutationFn: (body: { name: string }) => api.patch<Me>('/auth/me', body),
    onSuccess: setMe,
  })
  const changePassword = useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      api.post('/auth/change-password', body),
  })
  const forgotPassword = useMutation({
    mutationFn: (body: { email: string }) => api.post('/auth/forgot-password', body),
  })
  const resetPassword = useMutation({
    mutationFn: (body: { token: string; password: string }) =>
      api.post('/auth/reset-password', body),
  })

  return {
    login,
    register,
    acceptInvite,
    logout,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
  }
}
