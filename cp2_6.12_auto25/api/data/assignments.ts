import type { Assignment, Language } from '../../src/shared/types.js';

const assignments: Assignment[] = [
  {
    id: 'two-sum',
    title: 'Two Sum',
    description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.',
    languages: ['javascript', 'python', 'cpp'],
    testCases: [
      { id: 1, input: 'nums=[2,7,11,15], target=9', expectedOutput: '[0,1]' },
      { id: 2, input: 'nums=[3,2,4], target=6', expectedOutput: '[1,2]' },
      { id: 3, input: 'nums=[3,3], target=6', expectedOutput: '[0,1]' },
      { id: 4, input: 'nums=[1,5,3,7], target=8', expectedOutput: '[1,2]' },
      { id: 5, input: 'nums=[-1,-2,-3,-4,-5], target=-8', expectedOutput: '[2,4]' },
      { id: 6, input: 'nums=[10,20,30,40,50], target=70', expectedOutput: '[2,3]' },
    ],
    templates: {
      javascript: `function twoSum(nums, target) {
  // Write your solution here
  // Return an array of two indices
  
}`,
      python: `def two_sum(nums, target):
    # Write your solution here
    # Return a list of two indices
    pass`,
      cpp: `#include <vector>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    // Write your solution here
    // Return a vector of two indices
    return {};
}`,
    },
  },
  {
    id: 'palindrome',
    title: 'Palindrome Check',
    description: 'Given a string, determine if it is a palindrome. A palindrome is a word, phrase, number, or other sequence of characters that reads the same forward and backward. Only consider alphanumeric characters and ignore case.',
    languages: ['javascript', 'python', 'cpp'],
    testCases: [
      { id: 1, input: 's="A man, a plan, a canal: Panama"', expectedOutput: 'true' },
      { id: 2, input: 's="race a car"', expectedOutput: 'false' },
      { id: 3, input: 's=" "', expectedOutput: 'true' },
      { id: 4, input: 's="abba"', expectedOutput: 'true' },
      { id: 5, input: 's="abc"', expectedOutput: 'false' },
    ],
    templates: {
      javascript: `function isPalindrome(s) {
  // Write your solution here
  // Return true or false
  
}`,
      python: `def is_palindrome(s):
    # Write your solution here
    # Return True or False
    pass`,
      cpp: `#include <string>
using namespace std;

bool isPalindrome(string s) {
    // Write your solution here
    // Return true or false
    return false;
}`,
    },
  },
  {
    id: 'fibonacci',
    title: 'Fibonacci Sequence',
    description: 'Given an integer n, return the nth Fibonacci number. The Fibonacci sequence is defined as: F(0) = 0, F(1) = 1, F(n) = F(n-1) + F(n-2) for n > 1.',
    languages: ['javascript', 'python', 'cpp'],
    testCases: [
      { id: 1, input: 'n=0', expectedOutput: '0' },
      { id: 2, input: 'n=1', expectedOutput: '1' },
      { id: 3, input: 'n=2', expectedOutput: '1' },
      { id: 4, input: 'n=5', expectedOutput: '5' },
      { id: 5, input: 'n=10', expectedOutput: '55' },
      { id: 6, input: 'n=20', expectedOutput: '6765' },
      { id: 7, input: 'n=30', expectedOutput: '832040' },
    ],
    templates: {
      javascript: `function fibonacci(n) {
  // Write your solution here
  // Return the nth Fibonacci number
  
}`,
      python: `def fibonacci(n):
    # Write your solution here
    # Return the nth Fibonacci number
    pass`,
      cpp: `#include <vector>
using namespace std;

long long fibonacci(int n) {
    // Write your solution here
    // Return the nth Fibonacci number
    return 0;
}`,
    },
  },
];

export function getAssignments(): Assignment[] {
  return assignments;
}

export function getAssignmentById(id: string): Assignment | undefined {
  return assignments.find(a => a.id === id);
}

export function getTestCases(assignmentId: string) {
  const assignment = assignments.find(a => a.id === assignmentId);
  return assignment?.testCases || [];
}
