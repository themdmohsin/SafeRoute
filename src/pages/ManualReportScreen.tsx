import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader.tsx';
import Toast from '../components/Toast.tsx';

export default function ManualReportScreen() {
  const navigate = useNavigate();
  const [hazardType, setHazardType] = useState('pothole');
  const [severity, setSeverity] = useState('high');
  const [notes, setNotes] = useState('');
  const [realtimeAlert, setRealtimeAlert] = useState(true);
  const [hasPhoto, setHasPhoto] = useState(true);
  const [photoFileName, setPhotoFileName] = useState('Pothole_Indiranagar_100ft.jpg');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [toastMessage, setToastMessage] = useState('');
  const [isToastOpen, setIsToastOpen] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhotoFileName(e.target.files[0].name);
      setHasPhoto(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setToastMessage('Hazard Ticket #BBMP-8924 Logged! Nearby commuters alerted.');
      setIsToastOpen(true);
      setTimeout(() => {
        setIsSubmitting(false);
        navigate('/ride/active');
      }, 1200);
    }, 1000);
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
                INCIDENT DISPATCH
              </span>
              <span className="text-secondary font-body-sm text-body-sm">• BBMP Ward 112</span>
            </div>
            <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-primary font-bold tracking-tight">
              Report Road Hazard
            </h2>
            <p className="font-body-sm text-body-sm text-secondary">
              BBMP Civic Telemetry & Community Warning Network
            </p>
          </div>

          {/* Auto-locked GPS Geofence Tile */}
          <div className="bg-surface-container-low p-space-md rounded-2xl shadow-sm flex flex-col gap-space-sm relative overflow-hidden border border-outline-variant/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary-fixed-dim animate-pulse"></span>
                <span className="font-label-sm text-label-sm text-on-tertiary-fixed-variant uppercase tracking-wider font-semibold">
                  Auto-Locked GPS
                </span>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-highest text-primary font-label-sm text-label-sm font-semibold">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                <span>Accurate (±2m)</span>
              </span>
            </div>
            <div className="flex items-start gap-space-sm">
              <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-[22px]">my_location</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-headline-sm text-headline-sm text-on-surface truncate font-bold">
                  100ft Road, near 12th Main junction
                </p>
                <p className="font-body-sm text-body-sm text-secondary truncate">
                  Indiranagar, Bengaluru, KA 560038
                </p>
                <p className="font-label-md text-label-md text-surface-tint mt-0.5 font-mono font-medium">
                  12.9716° N, 77.6412° E
                </p>
              </div>
            </div>
            {/* Mini context map snippet */}
            <div
              className="w-full h-20 rounded-xl bg-cover bg-center mt-1 overflow-hidden opacity-90 shadow-inner"
              style={{
                backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuA34YzzfBZ-he-17o-FgBvTVYda5YSJ2R-3qoLkh2YgtlWrZ7pSgFmXqRkHmqmQbfPGQBRskoGsgTjODGgbGfxSlJE5oCIoSAu2D1Brh9TrNJ-ndnMAa6U_Y-ZZ0ODc0iW8s-_jBFPcyV0EH2SyDh7e3pQnYoUfkdHtD2ongvzicOS1ziR6cSXzmpII5pEkbLdlEgK_QKFxoONQ2dHh6ItM7bzZHOPDQMU83V4r7DbSeYE9NWEjEEEe')`,
              }}
            ></div>
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
                  { id: 'pothole', icon: '🕳️', title: 'Pothole', sub: 'Tarmac crater' },
                  { id: 'waterlogging', icon: '🌊', title: 'Waterlogging', sub: 'Flash puddle / flood' },
                  { id: 'open_manhole', icon: '⚙️', title: 'Open Manhole', sub: 'Missing drain lid' },
                  { id: 'speed_breaker', icon: '🚧', title: 'Speed Bump', sub: 'Unmarked hump' },
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
                    <span className="text-xl shrink-0">⚠️</span>
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
                    Helps BBMP emergency road crews prioritize hot-mix asphalt dispatch
                  </p>
                </div>

                {/* Thumbnail Preview Container */}
                {hasPhoto && (
                  <div className="w-full flex items-center justify-between p-2 rounded-xl bg-surface-container-lowest shadow-sm mt-1 border border-outline-variant/10">
                    <div className="flex items-center gap-space-sm">
                      <img
                        className="w-12 h-12 rounded-lg object-cover"
                        alt="Pothole verification"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuAi_Qqu4uJeeXaqFHBPawoj2kBxiJiP4KiZlBAfnMU-Dy1137WDtiMv_I0aSwXLCY9fJNNmSuwv0i3NF-G23VNXolshyYLYT_20u9CvZAeoyVw77H7jQgWZnGuzOq5pd-6ufVMBRWQfGWJ7tJETvf3Q7o9Vytl_OnsZtVFk9OUlHzrF32FkulHmXlOyn-swjee6Z0bIHxB8y_IZGGXT8k6RCdTQn7rh6pNzkQ6e58MhmOFh_NHlbGvm"
                      />
                      <div className="text-left">
                        <p className="font-label-md text-label-md text-on-surface font-semibold">{photoFileName}</p>
                        <p className="font-body-sm text-body-sm text-secondary">Auto-geo stamped • 2.4 MB</p>
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

            {/* Civic Broadcast Toggle */}
            <div className="p-space-md rounded-2xl bg-secondary-container/60 flex items-center justify-between gap-space-sm border border-outline-variant/10">
              <div className="flex items-start gap-space-sm">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[18px]">cell_tower</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-lg text-label-lg text-on-secondary-fixed font-semibold">
                    Real-Time SafeRoute Alert
                  </span>
                  <span className="font-body-sm text-body-sm text-on-secondary-container">
                    Instantly warn 418 commuters traveling on 100ft Road
                  </span>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  checked={realtimeAlert}
                  onChange={(e) => setRealtimeAlert(e.target.checked)}
                  className="sr-only peer"
                  type="checkbox"
                />
                <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface-container-lowest after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
              </label>
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
                <span>{isSubmitting ? 'Transmitting to BBMP Dispatch...' : 'Submit Hazard Report'}</span>
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
              <span>256-bit encrypted • BBMP Civic Portal sync</span>
            </div>
            <p className="font-body-sm text-body-sm text-outline max-w-xs">
              Reports comply with Karnataka Open Data Initiative standards for automated pothole tracking.
            </p>
          </div>
        </div>
      </main>

      <Toast message={toastMessage} icon="check_circle" isOpen={isToastOpen} onClose={() => setIsToastOpen(false)} />
    </div>
  );
}
