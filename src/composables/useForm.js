// Inertia er useForm er moto: form.errors, form.processing, form.reset() ...
// Ekhon URL er bodole `submit` e apni ekta async function dao.
import { reactive } from 'vue'
import { apiError } from '../bookApi'

export function useForm(initial) {
  const defaults = { ...initial }
  const form = reactive({
    ...initial,
    errors: {},
    processing: false,
    recentlySuccessful: false,
    reset(...keys) { (keys.length ? keys : Object.keys(defaults)).forEach((k) => { form[k] = defaults[k] }) },
    clearErrors() { form.errors = {} },
    data() { return Object.fromEntries(Object.keys(defaults).map((k) => [k, form[k]])) },
    // form.submit(payload => api.login(payload), { onSuccess, onError, onFinish })
    async submit(fn, { onSuccess, onError, onFinish } = {}) {
      form.processing = true; form.errors = {}
      try {
        const res = await fn(form.data())
        form.recentlySuccessful = true
        setTimeout(() => (form.recentlySuccessful = false), 2000)
        onSuccess?.(res)
      } catch (e) {
        const errs = e?.errors ?? e?.response?.data?.errors
        form.errors = errs ? Object.fromEntries(Object.entries(errs).map(([k, v]) => [k, [].concat(v)[0]])) : { _form: apiError(e) }
        if (!errs) form.errors[Object.keys(defaults)[0]] = apiError(e)
        onError?.(form.errors)
      } finally {
        form.processing = false
        onFinish?.()
      }
    },
  })
  return form
}
