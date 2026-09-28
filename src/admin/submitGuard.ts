import type { FormEvent } from 'react';

const pendingForms = new WeakSet<HTMLFormElement>();

/**
 * Prevents duplicate CRM form submissions while the first async save is running.
 * The submit button is disabled immediately and restored only if the form remains open.
 */
export function guardSubmit<T extends HTMLFormElement = HTMLFormElement>(
  handler: (event: FormEvent<T>) => void | Promise<void>
){
  return async (event: FormEvent<T>) => {
    const form=event.currentTarget;
    if(pendingForms.has(form)){
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    pendingForms.add(form);
    const submitter=(event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement|null;
    if(submitter) submitter.disabled=true;
    form.setAttribute('aria-busy','true');
    try{
      await handler(event);
    }finally{
      pendingForms.delete(form);
      form.removeAttribute('aria-busy');
      if(submitter&&submitter.isConnected) submitter.disabled=false;
    }
  };
}
