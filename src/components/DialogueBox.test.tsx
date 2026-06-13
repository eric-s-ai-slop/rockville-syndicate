import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import DialogueBox from './DialogueBox';

describe('DialogueBox', () => {
    const mockOnNext = vi.fn();
    const mockOnChoose = vi.fn();

    const defaultProps = {
        speakerName: 'Test Character',
        speakerEmoji: '😊',
        speakerColor: '#ff0000',
        lines: ['This is a test message.'],
        lineIndex: 0,
        onNext: mockOnNext,
    };

    beforeEach(() => {
        vi.useFakeTimers();
        mockOnNext.mockClear();
        mockOnChoose.mockClear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders the dialogue box with initial text', () => {
        render(<DialogueBox {...defaultProps} />);
        expect(screen.getByText('Test Character')).toBeInTheDocument();
        expect(screen.getByText('😊')).toBeInTheDocument();
    });

    it('completes text on single space press', () => {
        render(<DialogueBox {...defaultProps} />);

        act(() => {
             // trigger space to skip typing
             fireEvent.keyDown(window, { code: 'Space' });
        });

        expect(screen.getByText('This is a test message.')).toBeInTheDocument();
    });

    it('calls onNext when space is pressed after text is fully typed', () => {
        render(<DialogueBox {...defaultProps} />);

        act(() => {
            // First space finishes typing
            fireEvent.keyDown(window, { code: 'Space' });
        });

        act(() => {
            // Second space completes dialogue
            fireEvent.keyDown(window, { code: 'Space' });
        });

        expect(mockOnNext).toHaveBeenCalled();
    });

    it('handles choice selection via keyboard numbers', () => {
        const choices = [{text: 'Option A'}, {text: 'Option B'}];
        render(<DialogueBox {...defaultProps} choices={choices} onChoose={mockOnChoose} />);

        act(() => {
            // Finish typing to show choices
            fireEvent.keyDown(window, { code: 'Space' });
        });

        act(() => {
            fireEvent.keyDown(window, { key: '1' });
        });

        expect(mockOnChoose).toHaveBeenCalledWith(0);
    });
});
