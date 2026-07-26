import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SettingsModal from './SettingsModal';
import * as settingsModule from '../game/settings';

// Mock settings module
vi.mock('../game/settings', () => ({
  useSettings: vi.fn(),
  updateSettings: vi.fn(),
}));

describe('SettingsModal', () => {
  const mockOnClose = vi.fn();
  const mockSyncPhaserMute = vi.fn();

  const defaultSettings: settingsModule.Settings = {
    masterVolume: 1,
    musicVolume: 0.8,
    sfxVolume: 0.9,
    muted: false,
    difficulty: 'normal',
    textSpeedMs: 28,
    textScale: 1,
    colorBlind: false,
    reduceMotion: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (settingsModule.useSettings as any).mockReturnValue(defaultSettings);
  });

  it('renders with Audio tab selected by default', () => {
    render(<SettingsModal onClose={mockOnClose} syncPhaserMute={mockSyncPhaserMute} />);

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Master')).toBeInTheDocument(); // Audio tab content
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('calls onClose when close button or background overlay is clicked', () => {
    render(<SettingsModal onClose={mockOnClose} syncPhaserMute={mockSyncPhaserMute} />);

    // Background overlay (first div in render tree with fixed inset)
    const overlay = document.querySelector('.fixed.inset-0.z-50');
    fireEvent.click(overlay!);
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    // Close button
    const closeBtn = screen.getByText('✕');
    fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(2);
  });

  it('switches tabs and displays appropriate content', () => {
    render(<SettingsModal onClose={mockOnClose} syncPhaserMute={mockSyncPhaserMute} />);

    // Switch to Gameplay
    fireEvent.click(screen.getByText('Gameplay'));
    expect(screen.getByText('Difficulty')).toBeInTheDocument();

    // Switch to A11y
    fireEvent.click(screen.getByText('A11y'));
    expect(screen.getByText('Text Scale')).toBeInTheDocument();

    // Switch to Controls
    fireEvent.click(screen.getByText('Controls'));
    expect(screen.getByText('WASD / ↑↓←→')).toBeInTheDocument();
  });

  it('calls updateSettings when volume is changed', () => {
    render(<SettingsModal onClose={mockOnClose} syncPhaserMute={mockSyncPhaserMute} />);

    // The inputs don't have good labels for testing (range inputs)
    // We get them by their order in the DOM since we know Master, Music, SFX are first
    const sliders = screen.getAllByRole('slider');

    // Change master volume to 50%
    fireEvent.change(sliders[0], { target: { value: '50' } });
    expect(settingsModule.updateSettings).toHaveBeenCalledWith({ masterVolume: 0.5 });
  });

  it('calls updateSettings and syncPhaserMute when muted is toggled', () => {
    render(<SettingsModal onClose={mockOnClose} syncPhaserMute={mockSyncPhaserMute} />);

    const muteCheckbox = screen.getByRole('checkbox', { name: /mute all audio/i });
    fireEvent.click(muteCheckbox);

    expect(settingsModule.updateSettings).toHaveBeenCalledWith({ muted: true });
    expect(mockSyncPhaserMute).toHaveBeenCalledWith(true);
  });

  it('calls updateSettings when difficulty is changed', () => {
    render(<SettingsModal onClose={mockOnClose} syncPhaserMute={mockSyncPhaserMute} />);

    fireEvent.click(screen.getByText('Gameplay'));

    // Click 'hard' button
    fireEvent.click(screen.getByText('hard'));
    expect(settingsModule.updateSettings).toHaveBeenCalledWith({ difficulty: 'hard' });
  });

  it('calls updateSettings when accessibility options are changed', () => {
    render(<SettingsModal onClose={mockOnClose} syncPhaserMute={mockSyncPhaserMute} />);

    fireEvent.click(screen.getByText('A11y'));

    // Change text scale
    fireEvent.click(screen.getByText('1.5×'));
    expect(settingsModule.updateSettings).toHaveBeenCalledWith({ textScale: 1.5 });

    // Toggle color-blind mode
    const colorBlindCheckbox = screen.getByRole('checkbox', { name: /adds patterns/i });
    fireEvent.click(colorBlindCheckbox);
    expect(settingsModule.updateSettings).toHaveBeenCalledWith({ colorBlind: true });
  });
});
