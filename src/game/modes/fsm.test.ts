import { describe, it, expect, vi } from 'vitest';
import { FSM } from './fsm';

type TestState = 'IDLE' | 'ATTACK' | 'DEAD';

describe('FSM', () => {
  it('should initialize with the initial state and call enter if it exists', () => {
    const enterFn = vi.fn();
    const fsm = new FSM<TestState>('IDLE', {
      IDLE: { enter: enterFn },
      ATTACK: {},
      DEAD: {}
    });

    expect(fsm.state).toBe('IDLE');
    expect(fsm.is('IDLE')).toBe(true);
    expect(fsm.is('ATTACK')).toBe(false);
    expect(enterFn).toHaveBeenCalledOnce();
  });

  it('should not throw if initial state lacks an enter method', () => {
    const fsm = new FSM<TestState>('IDLE', {
      IDLE: {},
      ATTACK: {},
      DEAD: {}
    });

    expect(fsm.state).toBe('IDLE');
  });

  it('should transition to a new state, calling exit on old and enter on new', () => {
    const idleExit = vi.fn();
    const attackEnter = vi.fn();

    const fsm = new FSM<TestState>('IDLE', {
      IDLE: { exit: idleExit },
      ATTACK: { enter: attackEnter },
      DEAD: {}
    });

    fsm.transition('ATTACK');

    expect(fsm.state).toBe('ATTACK');
    expect(fsm.is('ATTACK')).toBe(true);
    expect(idleExit).toHaveBeenCalledOnce();
    expect(attackEnter).toHaveBeenCalledOnce();
  });

  it('should not do anything if transitioning to the same state', () => {
    const idleExit = vi.fn();
    const idleEnter = vi.fn();

    const fsm = new FSM<TestState>('IDLE', {
      IDLE: { enter: idleEnter, exit: idleExit },
      ATTACK: {},
      DEAD: {}
    });

    // Reset after initial enter
    idleEnter.mockClear();

    fsm.transition('IDLE');

    expect(idleExit).not.toHaveBeenCalled();
    expect(idleEnter).not.toHaveBeenCalled();
  });

  it('should handle transition when states lack enter/exit methods', () => {
    const fsm = new FSM<TestState>('IDLE', {
      IDLE: {},
      ATTACK: {},
      DEAD: {}
    });

    fsm.transition('ATTACK');
    expect(fsm.state).toBe('ATTACK');
  });

  it('should call update on the current state', () => {
    const idleUpdate = vi.fn();

    const fsm = new FSM<TestState>('IDLE', {
      IDLE: { update: idleUpdate },
      ATTACK: {},
      DEAD: {}
    });

    fsm.update(100, 16);
    expect(idleUpdate).toHaveBeenCalledWith(100, 16);
  });

  it('should not throw when update is called but state lacks update method', () => {
    const fsm = new FSM<TestState>('IDLE', {
      IDLE: {},
      ATTACK: {},
      DEAD: {}
    });

    expect(() => fsm.update(100, 16)).not.toThrow();
  });

  it('should support full sequences of multiple state transitions, calling lifecycle hooks correctly', () => {
    const order: string[] = [];

    const fsm = new FSM<TestState>('IDLE', {
      IDLE: {
        enter: () => order.push('IDLE enter'),
        exit: () => order.push('IDLE exit'),
        update: () => order.push('IDLE update')
      },
      ATTACK: {
        enter: () => order.push('ATTACK enter'),
        exit: () => order.push('ATTACK exit'),
        update: () => order.push('ATTACK update')
      },
      DEAD: {
        enter: () => order.push('DEAD enter'),
        exit: () => order.push('DEAD exit'),
        update: () => order.push('DEAD update')
      }
    });

    expect(order).toEqual(['IDLE enter']);

    fsm.update(10, 16);
    expect(order).toEqual(['IDLE enter', 'IDLE update']);

    fsm.transition('ATTACK');
    expect(order).toEqual(['IDLE enter', 'IDLE update', 'IDLE exit', 'ATTACK enter']);

    fsm.update(20, 16);
    expect(order).toEqual(['IDLE enter', 'IDLE update', 'IDLE exit', 'ATTACK enter', 'ATTACK update']);

    fsm.transition('DEAD');
    expect(order).toEqual(['IDLE enter', 'IDLE update', 'IDLE exit', 'ATTACK enter', 'ATTACK update', 'ATTACK exit', 'DEAD enter']);
  });
});
