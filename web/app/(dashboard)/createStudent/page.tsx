'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import CreateStudentForm from '@/components/createStudentForm';

export default function CreateStudentPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const router = useRouter();

  const handleClose = () => {
    setCurrentStep(1);
    router.push('/students');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1">
        <div className="bg-card w-full rounded-3xl shadow-sm border border-borderLine overflow-hidden">
            <div>
              <div className="flex justify-between items-center p-6 border-b border-borderLine">
                <h2 className="text-xl font-bold text-textLight">Add New Student</h2>
                <button onClick={handleClose} className="text-textMuted hover:text-textLight text-2xl">✕</button>
              </div>

              <div className="flex items-center justify-center gap-4 p-4 border-b border-borderLine">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-sm ${currentStep >= 1 ? 'bg-mint text-navy' : 'bg-navy border border-borderLine text-textMuted'}`}>1</div>
                  <span className={`text-sm font-bold ${currentStep >= 1 ? 'text-mint' : 'text-textMuted'}`}>Personnel</span>
                </div>
                <div className="flex-1 h-px bg-borderLine max-w-12" />
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-sm ${currentStep >= 2 ? 'bg-mint text-navy' : 'bg-navy border border-borderLine text-textMuted'}`}>2</div>
                  <span className={`text-sm font-bold ${currentStep >= 2 ? 'text-mint' : 'text-textMuted'}`}>Address</span>
                </div>
                <div className="flex-1 h-px bg-borderLine max-w-12" />
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-sm ${currentStep >= 3 ? 'bg-mint text-navy' : 'bg-navy border border-borderLine text-textMuted'}`}>3</div>
                  <span className={`text-sm font-bold ${currentStep >= 3 ? 'text-mint' : 'text-textMuted'}`}>Student Info</span>
                </div>
              </div>

              <div className="p-6">
                <CreateStudentForm onClose={handleClose} onStepChange={setCurrentStep} />
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}