import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ChapterSelect from './ChapterSelect';

// Mock audio to prevent test errors
vi.mock('../game/uiSound', () => ({
  playUi: vi.fn(),
}));

describe('ChapterSelect', () => {
  it('renders without crashing', () => {
    const mockOnFreePlayChange = vi.fn();
    const mockOnPick = vi.fn();

    expect(() =>
      render(
        <ChapterSelect
          heroColor="#ff0000"
          completed={[]}
          freePlay={false}
          onFreePlayChange={mockOnFreePlayChange}
          onPick={mockOnPick}
        />
      )
    ).not.toThrow();
  });

  it('renders a list of chapters and standard text', () => {
    const mockOnFreePlayChange = vi.fn();
    const mockOnPick = vi.fn();

    render(
      <ChapterSelect
        heroColor="#ff0000"
        completed={[]}
        freePlay={false}
        onFreePlayChange={mockOnFreePlayChange}
        onPick={mockOnPick}
      />
    );

    expect(screen.getByText(/More chapters unlock as the story unfolds/i)).toBeInTheDocument();
  });
});
