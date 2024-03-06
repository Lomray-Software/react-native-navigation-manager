import { expect } from 'chai';
import { describe, it } from 'vitest';
import { NavigationManager } from '../src';

describe('Navigation Manager', () => {
  it('should create manager', () => {
    const manager = new NavigationManager();
    console.log('123')
    expect(manager).to.instanceof(NavigationManager);
  });
});
