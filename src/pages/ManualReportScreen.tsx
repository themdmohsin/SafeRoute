import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader.tsx';
import Toast from '../components/Toast.tsx';
import { apiRequest } from '../lib/api';

export default function ManualReportScreen() {
  const navigate = useNavigate();
  const [hazardType, setHazardType] = useState('pothole');
  const [severity, setSeverity] = useState('');
  const [notes, setNotes] = useState('');
  const [hasPhoto, setHasPhoto] = useState(false);
  const [photoFileName, setPhotoFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [toastMessage, setToastMessage] = useState('');
  const [isToastOpen, setIsToastOpen] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhotoFileName(e.target.files[0].name);
      setHasPhoto(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (!navigator.geolocation) throw new Error('This browser does not provide device location.');
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error('Allow location access to submit a report.')), { enableHighAccuracy: true, timeout: 10000 });
      });
      const result = await apiRequest<{ hazard: { id: string }; classification?: { aiSuggested: boolean; severity: string } | null }>('/hazards', {
        method: 'POST',
        body: {
          hazardType: hazardType === 'cave_in' ? 'other' : hazardType,
          ...(severity ? { severity } : {}),
          description: notes.trim() || `${hazardType.replace('_', ' ')} hazard reported by a commuter.`,
          location: { type: 'Point', coordinates: [position.coords.longitude, position.coords.latitude] },
          roadName: 'Device location',
          area: 'Bengaluru',
          photoUrl: null,
          source: 'manual',
        },
      });
      const activeRideId = localStorage.getItem('saferoute_active_ride_id');
      if (activeRideId) {
        const reportCount = Number(localStorage.getItem('saferoute_active_ride_reports') || 0);
        localStorage.setItem('saferoute_active_ride_reports', String(reportCount + 1));
      }
      const classification = result.classification?.aiSuggested
        ? ` AI suggested ${result.classification.severity} severity.`
        : '';
      setToastMessage(`Hazard report saved.${classification}`);
      setIsToastOpen(true);
      window.setTimeout(() => navigate('/ride/active'), 900);
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : 'Unable to submit hazard report.');
      setIsToastOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-background font-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-secondary-container">
      {/* Header title FIXED to "Manual Hazard Report" */}
      <AppHeader title="Manual Hazard Report" variant="subpage" onBack={() => navigate('/ride/active')} />

      <main className="flex-1 flex flex-col relative w-full pt-16 pb-safe bg-surface max-w-lg mx-auto">
        <div className="flex flex-col w-full px-margin pb-space-xl gap-space-lg">
          {/* Sub-header context ribbon */}
          <div className="pt-space-sm flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-xs">
              <span className="inline-flex items-center px-space-sm py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">
                SAFEROUTE REPORT
              </span>

            </div>
            <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-primary font-bold tracking-tight">
              Report Road Hazard
            </h2>
            <p className="font-body-sm text-body-sm text-secondary">
              Reports are stored in SafeRoute. Municipal dispatch is not connected.
            </p>
          </div>

          {/* Device location */}
          <div className="bg-surface-container-low p-space-md rounded-2xl shadow-sm flex flex-col gap-space-sm relative overflow-hidden border border-outline-variant/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary-fixed-dim animate-pulse"></span>
              <span className="font-label-sm text-label-sm text-on-tertiary-fixed-variant uppercase tracking-wider font-semibold">
                  Device location captured on submit
                </span>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-highest text-primary font-label-sm text-label-sm font-semibold">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                <span>Accurate (Ãƒâ€šÃ‚Â±2m)</span>
              </span>
            </div>
            <div className="flex items-start gap-space-sm">
              <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-[22px]">my_location</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-headline-sm text-headline-sm text-on-surface truncate font-bold">
                  Device coordinates
                </p>
                <p className="font-body-sm text-body-sm text-secondary truncate">
                  Captured from your browser after consent
                </p>
                <p className="font-label-md text-label-md text-surface-tint mt-0.5 font-mono font-medium">
                  Stored in GeoJSON longitude, latitude order
                </p>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <form className="flex flex-col gap-space-lg" id="hazard-report-form" onSubmit={handleSubmit}>
            {/* Field 1: Hazard Type */}
            <div className="flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <label className="font-headline-sm text-headline-sm text-primary flex items-center gap-1.5 font-bold">
                  <span className="material-symbols-outlined text-[20px] text-tertiary-container">category</span>
                  <span>Hazard Type</span>
                </label>
                <span className="font-label-sm text-label-sm text-secondary">Select primary</span>
              </div>

              {/* Hazard Pill Selector */}
              <div className="grid grid-cols-2 gap-space-sm">
                {[
                  { id: 'pothole', icon: 'ÃƒÂ°Ã…Â¸Ã¢â‚¬Â¢Ã‚Â³ÃƒÂ¯Ã‚Â¸Ã‚Â', title: 'Pothole', sub: 'Tarmac crater' },
                  { id: 'waterlogging', icon: 'ÃƒÂ°Ã…Â¸Ã…â€™Ã…Â ', title: 'Waterlogging', sub: 'Flash puddle / flood' },
                  { id: 'open_manhole', icon: 'ÃƒÂ¢Ã…Â¡Ã¢â€žÂ¢ÃƒÂ¯Ã‚Â¸Ã‚Â', title: 'Open Manhole', sub: 'Missing drain lid' },
                  { id: 'speed_breaker', icon: 'ÃƒÂ°Ã…Â¸Ã…Â¡Ã‚Â§', title: 'Speed Bump', sub: 'Unmarked hump' },
                ].map((item) => {
                  const isChecked = hazardType === item.id;
                  return (
                    <label
                      key={item.id}
                      onClick={() => setHazardType(item.id)}
                      className="relative cursor-pointer"
                    >
                      <input
                        className="peer sr-only"
                        name="hazard_type"
                        type="radio"
                        checked={isChecked}
                        onChange={() => setHazardType(item.id)}
                      />
                      <div
                        className={`p-3 rounded-2xl flex items-center gap-space-sm transition-all duration-150 border ${
                          isChecked
                            ? 'bg-primary text-on-primary border-primary shadow-sm'
                            : 'bg-surface-container text-on-surface border-transparent hover:bg-surface-container-high'
                        }`}
                      >
                        <span className="text-xl shrink-0">{item.icon}</span>
                        <div className="min-w-0">
                          <p className="font-label-lg text-label-lg leading-tight truncate font-semibold">
                            {item.title}
                          </p>
                          <p className="font-body-sm text-body-sm opacity-80 truncate">{item.sub}</p>
                        </div>
                      </div>
                    </label>
                  );
                })}

                {/* Road Cave-in / Other */}
                <label
                  onClick={() => setHazardType('cave_in')}
                  className="relative cursor-pointer col-span-2"
                >
                  <input
                    className="peer sr-only"
                    name="hazard_type"
                    type="radio"
                    checked={hazardType === 'cave_in'}
                    onChange={() => setHazardType('cave_in')}
                  />
                  <div
                    className={`p-3 rounded-2xl flex items-center gap-space-sm transition-all duration-150 border ${
                      hazardType === 'cave_in'
                        ? 'bg-primary text-on-primary border-primary shadow-sm'
                        : 'bg-surface-container text-on-surface border-transparent hover:bg-surface-container-high'
                    }`}
                  >
                    <span className="text-xl shrink-0">ÃƒÂ¢Ã…Â¡Ã‚Â ÃƒÂ¯Ã‚Â¸Ã‚Â</span>
                    <div className="min-w-0">
                      <p className="font-label-lg text-label-lg leading-tight font-semibold">
                        Road Cave-in / Other Hazard
                      </p>
                      <p className="font-body-sm text-body-sm opacity-80">
                        Severe erosion, exposed rebar, collapsed sewer
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Field 2: Severity Risk Level */}
            <div className="flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <label className="font-headline-sm text-headline-sm text-primary flex items-center gap-1.5 font-bold">
                  <span className="material-symbols-outlined text-[20px] text-error">report</span>
                  <span>Severity Risk Level</span>
                </label>
                <span className="font-label-sm text-label-sm text-error font-bold">REQUIRED</span>
              </div>

              <div className="flex flex-col gap-space-xs">
                {/* Low */}
                <label onClick={() => setSeverity('low')} className="relative cursor-pointer">
                  <div
                    className={`p-3 rounded-xl flex items-center justify-between transition-all border ${
                      severity === 'low'
                        ? 'bg-surface-container-high border-primary/20'
                        : 'bg-surface-container-low border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-space-sm">
                      <span className="w-3 h-3 rounded-full bg-secondary"></span>
                      <div>
                        <span className="font-label-lg text-label-lg text-on-surface font-semibold">
                          Low Severity
                        </span>
                        <p className="font-body-sm text-body-sm text-secondary">
                          Superficial bump, cosmetic tarmac loss
                        </p>
                      </div>
                    </div>
                    <span
                      className={`material-symbols-outlined text-[18px] ${
                        severity === 'low' ? 'text-primary' : 'text-outline'
                      }`}
                    >
                      check_circle
                    </span>
                  </div>
                </label>

                {/* Medium */}
                <label onClick={() => setSeverity('medium')} className="relative cursor-pointer">
                  <div
                    className={`p-3 rounded-xl flex items-center justify-between transition-all border ${
                      severity === 'medium'
                        ? 'bg-surface-container-high border-tertiary-fixed-dim/40'
                        : 'bg-surface-container-low border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-space-sm">
                      <span className="w-3 h-3 rounded-full bg-tertiary-fixed-dim"></span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-label-lg text-label-lg text-on-surface font-semibold">
                            Medium Severity
                          </span>
                          <span className="px-1.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-bold">
                            Rim Risk
                          </span>
                        </div>
                        <p className="font-body-sm text-body-sm text-secondary">
                          Suspension stress, sudden braking required
                        </p>
                      </div>
                    </div>
                    <span
                      className={`material-symbols-outlined text-[18px] ${
                        severity === 'medium' ? 'text-primary' : 'text-outline'
                      }`}
                    >
                      check_circle
                    </span>
                  </div>
                </label>

                {/* High */}
                <label onClick={() => setSeverity('high')} className="relative cursor-pointer">
                  <div
                    className={`p-3 rounded-xl flex items-center justify-between transition-all border ${
                      severity === 'high'
                        ? 'bg-error-container border-error/30'
                        : 'bg-error-container/30 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-space-sm">
                      <span className="w-3 h-3 rounded-full bg-error"></span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-label-lg text-label-lg text-on-error-container font-bold">
                            High Severity
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-error text-on-error font-label-sm text-label-sm uppercase font-bold">
                            Deep Crater
                          </span>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-error-container">
                          Critical rollover/bike accident hazard (&gt;15cm)
                        </p>
                      </div>
                    </div>
                    <span
                      className="material-symbols-outlined text-error text-[20px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                  </div>
                </label>
                <button
                  type="button"
                  onClick={() => setSeverity('')}
                  className={`w-full p-3 rounded-xl border text-left font-label-md ${!severity ? 'bg-primary/10 border-primary text-primary' : 'bg-surface-container-low border-transparent text-secondary'}`}
                >
                  <span className="material-symbols-outlined align-middle mr-2">auto_awesome</span>
                  Let AI suggest severity from my description
                </button>
              </div>
            </div>

            {/* Field 3: Photo Upload Box */}
            <div className="flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <label className="font-headline-sm text-headline-sm text-primary flex items-center gap-1.5 font-bold">
                  <span className="material-symbols-outlined text-[20px] text-primary">add_a_photo</span>
                  <span>Field Photo Verification</span>
                </label>
                <span className="font-label-sm text-label-sm text-on-tertiary-container font-semibold">
                  +50 Civic Karma
                </span>
              </div>

              {/* Upload Container */}
              <div
                className="bg-surface-container-low rounded-2xl p-space-md flex flex-col items-center justify-center gap-space-sm transition-colors text-center relative overflow-hidden group hover:bg-surface-container border border-outline-variant/10"
                id="drop-zone"
              >
                <input
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  id="hazard-photo-input"
                  onChange={handlePhotoUpload}
                  type="file"
                />
                <div className="w-14 h-14 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[28px]">photo_camera</span>
                </div>
                <div className="flex flex-col items-center">
                  <p className="font-label-lg text-label-lg text-primary font-bold">Tap to snap or select photo</p>
                  <p className="font-body-sm text-body-sm text-secondary mt-0.5 max-w-[260px]">
                    Photo selection stays in this browser; photo upload is not connected.
                  </p>
                </div>

                {/* Thumbnail Preview Container */}
                {hasPhoto && (
                  <div className="w-full flex items-center justify-between p-2 rounded-xl bg-surface-container-lowest shadow-sm mt-1 border border-outline-variant/10">
                    <div className="flex items-center gap-space-sm">
                      <div className="text-left">
                        <p className="font-label-md text-label-md text-on-surface font-semibold">{photoFileName}</p>
                        <p className="font-body-sm text-body-sm text-secondary">Selected locally; not sent to the server</p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                  </div>
                )}
              </div>
            </div>

            {/* Field 4: Short Description */}
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center justify-between">
                <label className="font-headline-sm text-headline-sm text-primary flex items-center gap-1.5 font-bold" htmlFor="hazard-notes">
                  <span className="material-symbols-outlined text-[20px] text-secondary">notes</span>
                  <span>Lane & Dimension Notes</span>
                </label>
                <span className="font-label-sm text-label-sm text-secondary" id="char-counter">
                  {notes.length}/140
                </span>
              </div>
              <div className="bg-surface-container-lowest rounded-2xl p-space-sm shadow-sm border border-outline-variant/10">
                <textarea
                  className="w-full bg-transparent p-space-xs font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none resize-none"
                  id="hazard-notes"
                  maxLength={140}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe hazard dimensions or lane position (e.g. Left lane near bus stop, ~15cm deep, hard to spot in rain)"
                  rows={3}
                ></textarea>
              </div>
            </div>

            {/* Submission Action Buttons */}
            <div className="flex flex-col gap-space-sm pt-space-xs">
              <button
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#F5A623] to-[#E29010] text-[#1A202C] font-headline-sm text-headline-sm font-bold flex items-center justify-center gap-space-sm shadow-lg shadow-tertiary-fixed-dim/30 active:scale-[0.98] transition-transform cursor-pointer disabled:opacity-80"
                id="submit-button"
                type="submit"
                disabled={isSubmitting}
              >
                <span className={`material-symbols-outlined text-[24px] ${isSubmitting ? 'animate-spin' : ''}`}>
                  {isSubmitting ? 'sync' : 'verified'}
                </span>
                <span>{isSubmitting ? 'Saving report...' : 'Submit Hazard Report'}</span>
              </button>

              <button
                className="w-full h-11 rounded-xl text-secondary hover:text-on-surface font-label-lg text-label-lg flex items-center justify-center transition-colors cursor-pointer"
                onClick={() => navigate('/ride/active')}
                type="button"
              >
                Cancel and Return to Map
              </button>
            </div>
          </form>

          {/* Verified Trust Badge Footer */}
          <div className="mt-space-xs flex flex-col items-center gap-space-xs text-center">
            <div className="flex items-center gap-space-xs px-space-md py-1.5 rounded-full bg-surface-container-low text-secondary font-label-sm text-label-sm border border-outline-variant/10">
              <span className="material-symbols-outlined text-[16px] text-surface-tint">security</span>
              <span>Report stored in SafeRoute</span>
            </div>
            <p className="font-body-sm text-body-sm text-outline max-w-xs">
              Photo uploads and municipal dispatch are not configured.
            </p>
          </div>
        </div>
      </main>

      <Toast message={toastMessage} icon="check_circle" isOpen={isToastOpen} onClose={() => setIsToastOpen(false)} />
    </div>
  );
}
