// This is a test file for CodeFlow
const message = "Hello, this 'function' word is in a string!";
const comment = "// return should not be highlighted";

function main() {
    console.log("Starting program");
    const result = processData([1, 2, 3, 4, 5]);
    console.log("Result:", result);

    if (result > 10) {
        console.log("Large result");
    } else {
        console.log("Small result");
    }

    const pattern = /function/gi;
    const text = "function test with function keyword";
    console.log(text.match(pattern));
}

function processData(data) {
    let total = 0;
    for (let i = 0; i < data.length; i++) {
        total += transform(data[i]);
    }
    const final = validate(total);
    return final;
}

function transform(x) {
    return x * x + 2 * x + 1;
}

function validate(value) {
    if (value < 0) {
        throw new Error("Negative value");
    }
    const isEven = value % 2 === 0;
    const isPositive = value > 0;
    const isValid = isEven && isPositive;
    return isValid ? value : 0;
}

function recursiveFactorial(n) {
    if (n <= 1) return 1;
    return n * recursiveFactorial(n - 1);
}

function complexFunction(input) {
    let a = 1;
    let b = 2;
    let c = 3;
    let d = 4;
    let e = 5;
    let f = 6;
    let g = 7;
    let h = 8;
    let i = 9;
    let j = 10;
    let k = 11;
    let l = 12;
    let m = 13;
    let n = 14;
    let o = 15;
    let p = 16;
    let q = 17;
    return input + a + b + c + d + e + f + g + h + i + j + k + l + m + n + o + p + q;
}

/*
    This is a multi-line comment
    function should not be highlighted here
    return keyword also should not
*/

function mediumComplexity() {
    let sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += i;
    }
    const avg = sum / 10;
    return avg;
}

function entryPointA() {
    const x = processData([10, 20, 30]);
    const y = mediumComplexity();
    return x + y;
}

function entryPointB() {
    const result = recursiveFactorial(5);
    const value = complexFunction(result);
    return value;
}

main();
entryPointA();
entryPointB();
