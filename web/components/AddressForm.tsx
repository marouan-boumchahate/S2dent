'use client';

import FormField from './FormField';
import Button from './Button';
import { useState } from 'react';

export interface AddressData {
  address_line1: string;
  address_line2: string;
  street: string;
  district: string;
  state: string;
  postal_code: string;
  city: string;
  country: string;
}

interface AddressFormProps {
  onNext: (data: AddressData) => void;
  onBack: () => void;
  initialData?: Partial<AddressData>; // Keeps inputs populated if the user goes back and forward
}

export default function AddressForm({ onNext, onBack, initialData }: AddressFormProps) {
  const [addressLine1, setAddressLine1] = useState(initialData?.address_line1 || '');
  const [addressLine2, setAddressLine2] = useState(initialData?.address_line2 || '');
  const [street, setStreet] = useState(initialData?.street || '');
  const [district, setDistrict] = useState(initialData?.district || '');
  const [state, setState] = useState(initialData?.state || '');
  const [postalCode, setPostalCode] = useState(initialData?.postal_code || '');
  const [city, setCity] = useState(initialData?.city || '');
  const [country, setCountry] = useState(initialData?.country || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Package the state values into the schema required by your API definitions
    onNext({
      address_line1: addressLine1,
      address_line2: addressLine2,
      street,
      district,
      state,
      postal_code: postalCode,
      city,
      country,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full flex-1">
      <h2 className="text-3xl font-bold text-textLight mb-8">Address Information</h2>

      <div className="space-y-6">

        {/* address Line 1&2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FormField label="Address Line 1" value={addressLine1} onChange={setAddressLine1} />
          <FormField label="Address Line 2" value={addressLine2} onChange={setAddressLine2} />
        </div>

        {/* street, district */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FormField label="Street" value={street} onChange={setStreet} />
          <FormField label="District" value={district} onChange={setDistrict} />
        </div>

        {/* state, postal code */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FormField label="State" value={state} onChange={setState} />
          <FormField label="Postal Code" value={postalCode} onChange={setPostalCode} />
        </div>

        {/* city, country */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FormField label="City" value={city} onChange={setCity} required />
          <FormField label="Country" value={country} onChange={setCountry} required />
        </div>

      </div>

      <div className="mt-8 pb-4 flex gap-4">
        <button
          type="button"
          onClick={onBack}
          className="w-full p-3 rounded-lg border border-borderLine text-textMuted hover:bg-surface transition font-bold"
        >
          ← Back
        </button>
        <Button
          title="Next →"
          onClick={() => {}}
          type="submit"
          className="w-full bg-mint font-bold"
        />
      </div>
    </form>
  );
}