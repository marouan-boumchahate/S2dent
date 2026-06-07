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
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!city.trim()) {
      newErrors.city = 'City is required.';
    } else if (city.length > 100) {
      newErrors.city = 'City cannot exceed 100 characters.';
    }

    if (!country.trim()) {
      newErrors.country = 'Country is required.';
    } else if (country.length > 100) {
      newErrors.country = 'Country cannot exceed 100 characters.';
    }

    if (addressLine1 && addressLine1.length > 255) {
      newErrors.addressLine1 = 'Address line 1 cannot exceed 255 characters.';
    }
    if (addressLine2 && addressLine2.length > 255) {
      newErrors.addressLine2 = 'Address line 2 cannot exceed 255 characters.';
    }
    if (street && street.length > 255) {
      newErrors.street = 'Street cannot exceed 255 characters.';
    }
    if (district && district.length > 100) {
      newErrors.district = 'District cannot exceed 100 characters.';
    }
    if (state && state.length > 100) {
      newErrors.state = 'State cannot exceed 100 characters.';
    }
    if (postalCode && postalCode.length > 20) {
      newErrors.postalCode = 'Postal code cannot exceed 20 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCityChange = (val: string) => {
    setCity(val.replace(/[^a-zA-ZÀ-ÿ\s.-]/g, '').slice(0, 100));
  };

  const handleCountryChange = (val: string) => {
    setCountry(val.replace(/[^a-zA-ZÀ-ÿ\s.-]/g, '').slice(0, 100));
  };

  const handleDistrictChange = (val: string) => {
    setDistrict(val.replace(/[^a-zA-ZÀ-ÿ\s.-]/g, '').slice(0, 100));
  };

  const handleStateChange = (val: string) => {
    setState(val.replace(/[^a-zA-ZÀ-ÿ\s.-]/g, '').slice(0, 100));
  };

  const handlePostalCodeChange = (val: string) => {
    setPostalCode(val.replace(/[^a-zA-Z0-9\s-]/g, '').slice(0, 20));
  };

  const handleAddressLine1Change = (val: string) => {
    setAddressLine1(val.slice(0, 255));
  };

  const handleAddressLine2Change = (val: string) => {
    setAddressLine2(val.slice(0, 255));
  };

  const handleStreetChange = (val: string) => {
    setStreet(val.slice(0, 255));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
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

        {/* address Line 1 & 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FormField label="Address Line 1" value={addressLine1} onChange={handleAddressLine1Change} error={errors.addressLine1} maxLength={255} />
          <FormField label="Address Line 2" value={addressLine2} onChange={handleAddressLine2Change} error={errors.addressLine2} maxLength={255} />
        </div>

        {/* street, district */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FormField label="Street" value={street} onChange={handleStreetChange} error={errors.street} maxLength={255} />
          <FormField label="District" value={district} onChange={handleDistrictChange} error={errors.district} maxLength={100} />
        </div>

        {/* state, postal code */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FormField label="State" value={state} onChange={handleStateChange} error={errors.state} maxLength={100} />
          <FormField label="Postal Code" value={postalCode} onChange={handlePostalCodeChange} error={errors.postalCode} maxLength={20} />
        </div>

        {/* city, country */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FormField label="City" value={city} onChange={handleCityChange} error={errors.city} required maxLength={100} />
          <FormField label="Country" value={country} onChange={handleCountryChange} error={errors.country} required maxLength={100} />
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