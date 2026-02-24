import { X } from 'lucide-react';
import React from 'react'
import toast, { ToastBar, Toaster } from 'react-hot-toast';

export const DismissableToaster = () => {
    return (
        <Toaster
            position='top-center'
            gutter={12}
            containerStyle={{ margin: '8px' }}
            toastOptions={{
                success: {
                    duration: 3000,
                },
                error: {
                    duration: 3000,
                },
                style: {
                    fontSize: '16px',
                    maxWidth: '500px',
                    padding: '16px 24px',
                }
            }}
        >
            {(t) => (
                <ToastBar toast={t}>
                    {({ icon, message }) => (
                        <>
                            {icon}
                            {message}
                            {t.type !== 'loading' && ( // Optional: don't show the close button for loading toasts
                                <button
                                    className='cursor-pointer'
                                    onClick={() => toast.dismiss(t.id)}
                                >
                                    <X />
                                </button>
                            )}
                        </>
                    )}
                </ToastBar>
            )}
        </Toaster>
    );
};
