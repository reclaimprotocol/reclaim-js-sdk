import { escapeRegExp, replaceAll } from '../helper';

describe('escapeRegExp', () => {
  it('should escape special characters in a string', () => {
    const input = '.*+?^${}()|[]\\';
    const expectedOutput = '\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\';
    expect(escapeRegExp(input)).toBe(expectedOutput);
  });

  it('should return the same string if there are no special characters', () => {
    const input = 'abc123';
    const expectedOutput = 'abc123';
    expect(escapeRegExp(input)).toBe(expectedOutput);
  });

  it('should return an empty string if the input is empty', () => {
    const input = '';
    const expectedOutput = '';
    expect(escapeRegExp(input)).toBe(expectedOutput);
  });
});

describe('replaceAll', () => {
  it('should replace all occurrences of a substring in a string', () => {
    const str = 'hello world, hello universe';
    const find = 'hello';
    const replace = 'hi';
    const expectedOutput = 'hi world, hi universe';
    expect(replaceAll(str, find, replace)).toBe(expectedOutput);
  });

  it('should return the same string if the substring to find is not present', () => {
    const str = 'hello world';
    const find = 'bye';
    const replace = 'hi';
    const expectedOutput = 'hello world';
    expect(replaceAll(str, find, replace)).toBe(expectedOutput);
  });

  it('should return the same string if the substring to find is empty', () => {
    const str = 'hello world';
    const find = '';
    const replace = 'hi';
    const expectedOutput = 'hello world';
    expect(replaceAll(str, find, replace)).toBe(expectedOutput);
  });

  it('should replace all occurrences of a substring containing special regex characters', () => {
    const str = 'hello.world.hello.world';
    const find = '.';
    const replace = '!';
    const expectedOutput = 'hello!world!hello!world';
    expect(replaceAll(str, find, replace)).toBe(expectedOutput);
  });

  it('should return an empty string if the input string is empty', () => {
    const str = '';
    const find = 'hello';
    const replace = 'hi';
    const expectedOutput = '';
    expect(replaceAll(str, find, replace)).toBe(expectedOutput);
  });

  it('should handle overlapping substrings correctly', () => {
    const str = 'aaa';
    const find = 'aa';
    const replace = 'b';
    const expectedOutput = 'ba';
    expect(replaceAll(str, find, replace)).toBe(expectedOutput);
  });

  it('should replace the substring with an empty string', () => {
    const str = 'hello world';
    const find = 'world';
    const replace = '';
    const expectedOutput = 'hello ';
    expect(replaceAll(str, find, replace)).toBe(expectedOutput);
  });
});