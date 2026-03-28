import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

/**
 * QRCodeGenerator - A React component that generates QR codes from user input
 * Features:
 * - Real-time QR code generation as user types
 * - Advanced customization (colors, size, error correction, border)
 * - Preset system with built-in and custom presets
 * - Download QR code as PNG image with current settings
 * - Color contrast validation for scannability
 * - Responsive design for desktop and mobile
 */

// Storage key for custom presets
const STORAGE_KEY = 'qrCodeCustomPresets';

// Error correction levels
const ERROR_CORRECTION_LEVELS = [
  { value: 'L', label: 'Low (7%)', description: 'Best for short text' },
  { value: 'M', label: 'Medium (15%)', description: 'Default option' },
  { value: 'Q', label: 'Quartile (25%)', description: 'Good for longer text' },
  { value: 'H', label: 'High (30%)', description: 'Best for damage protection' },
];

// Built-in presets with validated scannability
const BUILT_IN_PRESETS = [
  {
    id: 'professional-blue',
    name: 'Professional Blue',
    fgColor: '#1E3A8A',
    bgColor: '#FFFFFF',
    errorCorrection: 'H',
    borderSize: 4,
    description: 'Corporate blue for business use'
  },
  {
    id: 'high-contrast',
    name: 'High-Contrast',
    fgColor: '#000000',
    bgColor: '#FFFFFF',
    errorCorrection: 'H',
    borderSize: 4,
    description: 'Maximum contrast for reliable scanning'
  },
  {
    id: 'minimal',
    name: 'Minimal',
    fgColor: '#374151',
    bgColor: '#F9FAFB',
    errorCorrection: 'L',
    borderSize: 2,
    description: 'Clean, subtle appearance'
  },
  {
    id: 'vibrant',
    name: 'Vibrant',
    fgColor: '#7C3AED',
    bgColor: '#FEF3C7',
    errorCorrection: 'Q',
    borderSize: 4,
    description: 'Eye-catching colors for marketing'
  },
  {
    id: 'dark-mode',
    name: 'Dark Mode',
    fgColor: '#10B981',
    bgColor: '#1F2937',
    errorCorrection: 'H',
    borderSize: 6,
    description: 'Dark background with green pattern'
  },
  {
    id: 'elegant-black',
    name: 'Elegant Black',
    fgColor: '#111827',
    bgColor: '#F3F4F6',
    errorCorrection: 'M',
    borderSize: 3,
    description: 'Sophisticated grayscale design'
  },
  {
    id: 'bold-red',
    name: 'Bold Red',
    fgColor: '#DC2626',
    bgColor: '#FFFFFF',
    errorCorrection: 'H',
    borderSize: 4,
    description: 'High-impact red for attention'
  },
  {
    id: 'modern-teal',
    name: 'Modern Teal',
    fgColor: '#0D9488',
    bgColor: '#F0FDFA',
    errorCorrection: 'Q',
    borderSize: 4,
    description: 'Contemporary teal style'
  }
];

// Calculate relative luminance for contrast ratio
const getLuminance = (hexColor) => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const toLinear = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
};

// Calculate contrast ratio between two colors
const getContrastRatio = (color1, color2) => {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

// Validate color combination for scannability
const validateColorCombination = (fgColor, bgColor) => {
  const contrast = getContrastRatio(fgColor, bgColor);
  
  if (contrast < 3) {
    return {
      valid: false,
      message: 'Colors have insufficient contrast. Use darker foreground or lighter background.',
      level: 'error'
    };
  }
  
  if (contrast < 5) {
    return {
      valid: true,
      message: 'Warning: Low contrast may affect scanning in some conditions.',
      level: 'warning'
    };
  }
  
  return { valid: true, message: '', level: 'success' };
};

// Validate a preset for scannability
const validatePreset = (preset) => {
  return validateColorCombination(preset.fgColor, preset.bgColor);
};

function App() {
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState('');
  
  // Customization state
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [size, setSize] = useState(256);
  const [errorCorrection, setErrorCorrection] = useState('H');
  const [borderSize, setBorderSize] = useState(4);
  
  const [showSettings, setShowSettings] = useState(false);
  const [activePreset, setActivePreset] = useState(null);
  const [customPresets, setCustomPresets] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const qrRef = useRef(null);
  
  // Load custom presets from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCustomPresets(parsed);
        }
      }
    } catch (err) {
      console.error('Failed to load custom presets:', err);
      // Gracefully handle corrupted data
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);
  
  // Save custom presets to localStorage
  const saveCustomPresets = useCallback((presets) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
      setCustomPresets(presets);
    } catch (err) {
      console.error('Failed to save custom presets:', err);
    }
  }, []);
  
  // Validate color combination
  const colorValidation = useMemo(() => 
    validateColorCombination(fgColor, bgColor), 
    [fgColor, bgColor]
  );
  
  // Handle input change with validation
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setInputText(value);
    
    if (value.length === 0) {
      setError('Please enter some text to generate a QR code');
    } else if (value.length > 2953) {
      setError('Text is too long. QR codes have a maximum capacity.');
    } else {
      setError('');
    }
  }, []);
  
  // Handle foreground color change
  const handleFgColorChange = useCallback((e) => {
    const newColor = e.target.value;
    setFgColor(newColor);
    setActivePreset(null); // Clear preset when manually changing colors
  }, []);
  
  // Handle background color change
  const handleBgColorChange = useCallback((e) => {
    const newColor = e.target.value;
    setBgColor(newColor);
    setActivePreset(null);
  }, []);
  
  // Handle size change
  const handleSizeChange = useCallback((e) => {
    const newSize = parseInt(e.target.value, 10);
    if (newSize >= 64 && newSize <= 512) {
      setSize(newSize);
    }
  }, []);
  
  // Handle error correction change
  const handleErrorCorrectionChange = useCallback((e) => {
    setErrorCorrection(e.target.value);
    setActivePreset(null);
  }, []);
  
  // Handle border size change
  const handleBorderChange = useCallback((e) => {
    const newBorder = parseInt(e.target.value, 10);
    if (newBorder >= 0 && newBorder <= 20) {
      setBorderSize(newBorder);
      setActivePreset(null);
    }
  }, []);
  
  // Apply a preset
  const applyPreset = useCallback((preset) => {
    setFgColor(preset.fgColor);
    setBgColor(preset.bgColor);
    setErrorCorrection(preset.errorCorrection);
    setBorderSize(preset.borderSize);
    setActivePreset(preset.id);
  }, []);
  
  // Save current settings as custom preset
  const saveCustomPreset = useCallback(() => {
    if (!newPresetName.trim()) return;
    
    const newPreset = {
      id: `custom-${Date.now()}`,
      name: newPresetName.trim(),
      fgColor,
      bgColor,
      errorCorrection,
      borderSize,
      isCustom: true
    };
    
    const validation = validatePreset(newPreset);
    if (!validation.valid) {
      setError('Cannot save preset: Color contrast is too low for reliable scanning.');
      return;
    }
    
    const updatedPresets = [...customPresets, newPreset];
    saveCustomPresets(updatedPresets);
    setNewPresetName('');
    setShowSaveModal(false);
    setActivePreset(newPreset.id);
  }, [newPresetName, fgColor, bgColor, errorCorrection, borderSize, customPresets, saveCustomPresets]);
  
  // Delete a custom preset
  const deleteCustomPreset = useCallback((presetId) => {
    const updatedPresets = customPresets.filter(p => p.id !== presetId);
    saveCustomPresets(updatedPresets);
    if (activePreset === presetId) {
      setActivePreset(null);
    }
  }, [customPresets, activePreset, saveCustomPresets]);
  
  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setFgColor('#000000');
    setBgColor('#FFFFFF');
    setSize(256);
    setErrorCorrection('H');
    setBorderSize(4);
    setActivePreset(null);
  }, []);
  
  // Validate that input can generate a scannable QR code
  const isValidInput = inputText.trim().length > 0 && !error;
  const isScannable = isValidInput && colorValidation.valid;
  
  // Download QR code as PNG image with current settings
  const downloadQRCode = useCallback(() => {
    if (!isValidInput || !qrRef.current) return;
    
    if (!colorValidation.valid) {
      setError('Cannot download: Please fix color contrast issues first.');
      return;
    }
    
    try {
      const svg = qrRef.current.querySelector('svg');
      if (!svg) {
        setError('Failed to generate QR code. Please try again.');
        return;
      }
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const svgData = new XMLSerializer().serializeToString(svg);
      
      const img = new Image();
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        const downloadSize = Math.max(size, 512);
        canvas.width = downloadSize;
        canvas.height = downloadSize;
        
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, downloadSize, downloadSize);
        
        ctx.drawImage(img, 0, 0, downloadSize, downloadSize);
        
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `qrcode-${Date.now()}.png`;
        
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        URL.revokeObjectURL(url);
      };
      
      img.onerror = () => {
        setError('Failed to generate image. Please try again.');
      };
      
      img.src = url;
    } catch (err) {
      setError('Failed to download QR code. Please try again.');
      console.error('Download error:', err);
    }
  }, [isValidInput, colorValidation.valid, size, bgColor]);
  
  // Combine all presets for display
  const allPresets = useMemo(() => [
    ...BUILT_IN_PRESETS.map(p => ({ ...p, validation: validatePreset(p) })),
    ...customPresets.map(p => ({ ...p, validation: validatePreset(p), isCustom: true }))
  ], [customPresets]);
  
  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <h1 className="app-title">QR Code Generator</h1>
        <p className="app-subtitle">Generate and download customizable QR codes instantly</p>
      </header>
      
      {/* Main Content */}
      <main className="main-content">
        {/* Input Section */}
        <section className="input-section">
          <div className="input-card">
            <label htmlFor="qr-input" className="input-label">
              Enter your text or URL
            </label>
            <div className="input-wrapper">
              <textarea
                id="qr-input"
                className={`text-input text-area ${error ? 'error' : ''}`}
                placeholder="Type anything here..."
                value={inputText}
                onChange={handleInputChange}
                maxLength={2953}
                aria-describedby="input-hint"
                rows={3}
              />
            </div>
            
            {error && (
              <p className="error-message" role="alert">
                ⚠️ {error}
              </p>
            )}
            
            <p id="input-hint" className="input-hint">
              {inputText.length > 0 
                ? `${inputText.length} characters`
                : 'Enter any text, URL, or data to generate a QR code'}
            </p>
            
            {/* Customization Panel Toggle */}
            <button 
              className="settings-toggle"
              onClick={() => setShowSettings(!showSettings)}
              aria-expanded={showSettings}
            >
              <svg 
                className={`settings-icon ${showSettings ? 'rotated' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
                />
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                />
              </svg>
              {showSettings ? 'Hide Settings' : 'Customize QR Code'}
            </button>
            
            {/* Customization Panel */}
            {showSettings && (
              <div className="settings-panel">
                <div className="settings-header">
                  <h3>Customization Options</h3>
                  <button 
                    className="reset-button"
                    onClick={resetToDefaults}
                    title="Reset to defaults"
                  >
                    Reset
                  </button>
                </div>
                
                {/* Presets Section */}
                <div className="settings-group">
                  <h4 className="settings-group-title">Quick Presets</h4>
                  <div className="preset-grid">
                    {allPresets.map((preset) => (
                      <div key={preset.id} className="preset-item-wrapper">
                        <button
                          className={`preset-button ${activePreset === preset.id ? 'active' : ''} ${!preset.validation.valid ? 'invalid' : ''}`}
                          onClick={() => applyPreset(preset)}
                          title={preset.description || preset.name}
                        >
                          <span 
                            className="preset-preview"
                            style={{ backgroundColor: preset.bgColor }}
                          >
                            <span 
                              className="preset-pattern"
                              style={{ backgroundColor: preset.fgColor }}
                            />
                          </span>
                          <span className="preset-name">{preset.name}</span>
                        </button>
                        {preset.isCustom && (
                          <button
                            className="preset-delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteCustomPreset(preset.id);
                            }}
                            title="Delete preset"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button 
                    className="save-preset-button"
                    onClick={() => setShowSaveModal(true)}
                  >
                    <svg 
                      className="save-preset-icon"
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M12 4v16m8-8H4" 
                      />
                    </svg>
                    Save Custom Preset
                  </button>
                </div>
                
                {/* Color Settings */}
                <div className="settings-group">
                  <h4 className="settings-group-title">Colors</h4>
                  
                  <div className="color-input-row">
                    <div className="color-input-group">
                      <label htmlFor="fg-color" className="color-label">
                        Foreground
                      </label>
                      <div className="color-picker-wrapper">
                        <input
                          id="fg-color"
                          type="color"
                          className="color-picker"
                          value={fgColor}
                          onChange={handleFgColorChange}
                        />
                        <span className="color-value">{fgColor}</span>
                      </div>
                    </div>
                    
                    <div className="color-input-group">
                      <label htmlFor="bg-color" className="color-label">
                        Background
                      </label>
                      <div className="color-picker-wrapper">
                        <input
                          id="bg-color"
                          type="color"
                          className="color-picker"
                          value={bgColor}
                          onChange={handleBgColorChange}
                        />
                        <span className="color-value">{bgColor}</span>
                      </div>
                    </div>
                  </div>
                  
                  {colorValidation.level !== 'success' && (
                    <div className={`color-warning ${colorValidation.level}`}>
                      {colorValidation.level === 'error' ? '⚠️ ' : '⚡ '}
                      {colorValidation.message}
                    </div>
                  )}
                </div>
                
                {/* Size Settings */}
                <div className="settings-group">
                  <h4 className="settings-group-title">Size</h4>
                  <div className="slider-input-group">
                    <input
                      type="range"
                      className="slider-input"
                      min="64"
                      max="512"
                      step="8"
                      value={size}
                      onChange={handleSizeChange}
                    />
                    <span className="slider-value">{size}px</span>
                  </div>
                </div>
                
                {/* Error Correction Level */}
                <div className="settings-group">
                  <h4 className="settings-group-title">Error Correction</h4>
                  <div className="radio-group">
                    {ERROR_CORRECTION_LEVELS.map((level) => (
                      <label key={level.value} className="radio-label">
                        <input
                          type="radio"
                          name="errorCorrection"
                          value={level.value}
                          checked={errorCorrection === level.value}
                          onChange={handleErrorCorrectionChange}
                          className="radio-input"
                        />
                        <span className="radio-custom"></span>
                        <span className="radio-content">
                          <span className="radio-label-text">{level.label}</span>
                          <span className="radio-description">{level.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                
                {/* Border Size */}
                <div className="settings-group">
                  <h4 className="settings-group-title">Border (Quiet Zone)</h4>
                  <div className="slider-input-group">
                    <input
                      type="range"
                      className="slider-input"
                      min="0"
                      max="20"
                      step="1"
                      value={borderSize}
                      onChange={handleBorderChange}
                    />
                    <span className="slider-value">{borderSize}px</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
        
        {/* QR Code Display Section */}
        <section className="qr-section">
          <div className="qr-card">
            {isValidInput ? (
              <>
                <div className="qr-display" ref={qrRef}>
                  <div 
                    className="qr-container"
                    style={{
                      padding: `${borderSize}px`,
                      backgroundColor: bgColor,
                    }}
                  >
                    <QRCodeSVG
                      value={inputText}
                      size={size}
                      level={errorCorrection}
                      includeMargin={false}
                      bgColor="transparent"
                      fgColor={fgColor}
                      imageSettings={{
                        src: '',
                        height: 0,
                        width: 0,
                        excavate: false,
                      }}
                    />
                  </div>
                </div>
                
                <div className="qr-info">
                  <p className="qr-info-label">Preview</p>
                  <p className="qr-info-text">
                    {inputText.length > 50 
                      ? `${inputText.substring(0, 50)}...` 
                      : inputText}
                  </p>
                  <p className="qr-info-meta">
                    {size}px • {fgColor} on {bgColor} • {ERROR_CORRECTION_LEVELS.find(l => l.value === errorCorrection)?.label}
                  </p>
                </div>
                
                <button
                  className={`download-button ${!isScannable ? 'disabled' : ''}`}
                  onClick={downloadQRCode}
                  disabled={!isScannable}
                  aria-label="Download QR code as PNG image"
                >
                  <svg 
                    className="download-icon" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" 
                    />
                  </svg>
                  Download PNG
                </button>
                
                {!isScannable && (
                  <p className="scan-warning">
                    Fix color contrast to enable download
                  </p>
                )}
              </>
            ) : (
              <div className="qr-placeholder">
                {inputText.length === 0 
                  ? 'Enter text to see QR code' 
                  : 'Invalid input'}
              </div>
            )}
          </div>
        </section>
      </main>
      
      {/* Save Preset Modal */}
      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Save Custom Preset</h3>
            <p className="modal-description">
              Save your current settings as a preset for quick access later.
            </p>
            <div className="modal-preview">
              <div 
                className="modal-preview-box"
                style={{ backgroundColor: bgColor }}
              >
                <span 
                  className="modal-preview-pattern"
                  style={{ backgroundColor: fgColor }}
                />
              </div>
              <div className="modal-preview-details">
                <span className="modal-preview-label">Current Settings</span>
                <span className="modal-preview-value">
                  {fgColor} on {bgColor}
                </span>
                <span className="modal-preview-value">
                  {ERROR_CORRECTION_LEVELS.find(l => l.value === errorCorrection)?.label} • {borderSize}px border
                </span>
              </div>
            </div>
            <div className="modal-input-group">
              <label htmlFor="preset-name" className="modal-label">
                Preset Name
              </label>
              <input
                id="preset-name"
                type="text"
                className="modal-input"
                placeholder="My Custom Preset"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                maxLength={30}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button 
                className="modal-cancel"
                onClick={() => {
                  setShowSaveModal(false);
                  setNewPresetName('');
                }}
              >
                Cancel
              </button>
              <button 
                className="modal-save"
                onClick={saveCustomPreset}
                disabled={!newPresetName.trim() || !colorValidation.valid}
              >
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Footer */}
      <footer className="app-footer">
        <p>Built with React & qrcode.react • Customizable QR Code Generator</p>
      </footer>
    </div>
  );
}

export default App;