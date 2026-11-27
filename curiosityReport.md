# Curiosity-Report
## The Struggle with Testing  

Writing good tests can be a learning curve for new developers. One particularly difficult part of testing is having confidence that the tests are effective. Early developers may assume that because a test is passing, it is a good test. Some developers may also believe they have adequate tests because their tests achieve a high level of code coverage. However, this assumption can be misleading. A passing test may be confirming a bug, and code coverage does not always correlate with correct tests. Stryker Mutator is an open-sourced mutation tool, which aims to combat this obstacle. 

## Mutation Testing — Stryker Mutator

Stryker Mutator provides a way to test the effectiveness of your unit tests. It provides mutation testing, where "mutations" are inserted into your source code, that should cause tests to fail. For instance, a '<' may be switched to a '>='. If the mutation does not cause the tests to fail, there may be a bug in the tests, or in the code. This can help catch edge cases that may not have been accounted for in the tests.  

Stryker supports three different frameworks for different languages: JavaScript/TypeScript, C#, and Scala. For this tutorial we will use the framework for JavaScript, which also uses Jest. 

## Mutator Examples
Stryker Mutator supports mutations on things such as arithmetic operators, logical operators, equality operators, as well as method expressions (which are specific to the specific Stryker framework used).  

### Arithmetic Operator
| Mutant operator | Original | Mutated |
| :--- | :---: | :---: |
| AdditionNegation | a + b | a - b |
| SubtractionNegation | a - b | a + b |
| MultiplicationNegation | a * b | a / b |
| DivisionNegation | a / b | a * b |

### Array Declaration
| Mutant operator | Original | Mutated |
| :--- | :---: | :---: |
| ArrayConstructorItemsRemoval | new Array(1, 2, 3, 4)b |	new Array() |
| ArrayLiteralItemsRemoval | [1, 2, 3, 4] | [ ] |

### Method Expressions
Some method expressions for JavaScript/TypeScript include:
| Mutant operator | Original | Mutated |
| :--- | :---: | :---: |
| SortRemoval | sort()	 |	|
| FilterRemoval | filter() |  |
| MinToMax | min() | max() |
| MaxToMin | max() | min() |

This is not an extensive list of the operators supported. View the full list [here.](http://stryker-mutator.io/docs/mutation-testing-elements/supported-mutators/)


## Tutorial / Experiment

Stryker has an example repo to demonstrate the mutator. Clone this repo to your local machine using the command: 
```
git clone https://github.com/stryker-mutator/robo-coasters-example && cd robo-coasters-example
```

Then checkout the branch that does not already have Stryker installed and set up: 
```
git checkout pre-stryker
npm install
```
Now we have a built out project, that has been 'thoroughly' tested. By running 
```
npm test
```
we see the coverage report reporting 100% line, branch, statement, and function coverage.  

Now its time to bring Stryker into the project, to analyze the effectiveness of the tests. To initialize Stryker, run 
```
npm init stryker
```
Select the following options in the setup process:
 - Framework: `None/Other`
 - Test Runner: `jest`
 - Reporters: `html`. `clear-text`, and `progress`
 - Package Manager: `npm`
 - File Type: `json`

Since we are working with ECMAScript modules, we need to modify the stryer.config.json file. Add 
```
"testRunnerNodeArgs": ["--experimental-vm-modules"]
```
 to the config.

Now we are ready to run Stryker and test the automated tests:  
```
npx stryker run
```
Examine the terminal output to find a list of "mutants" that survived, as well as a table showing a report of the results.

![Alt text](assets/strykerInitialTable.png)

Surviving mutants indicate a test that still passed, when a mutation caused it to fail. The initial tests only caught 63.4% of the mutants! We can now use these surviving mutants to improve the effectiveness of the tests.

For instance, `/pipes/ride-summary.pipes.js` left several surviving mutants. This file had a mutant score of 50, which means that 50% of the mutators injected into the code did not cause a test to fail. 

Further up in the test output, it shows what mutants survived, including: 

![Alt text](assets/strykerSurvivedMutants.png)


This shows that a comparison operator injection should have caused a test to fail, but didn't. The particular line of code finds the minimum height of the riders listed. We can go to the test file, and add this test: 
```
  it('should correctly calculate the min height', () => {
        const actualSummary = ridesSummary(
      createRideOrder({
        people: [
          createPerson({ height: 10 }),
          createPerson({ height: 50 }),
          createPerson({ height: 20 }),
        ],
        ride: createRide({ minHeight: 10 }),
      }),
    );
    expect(actualSummary).toContain('>= 10');
  })
```
Next, a mutant that switched a conditional to always return true did not cause a test to fail, meaning it was not tested.  

![Alt text](assets/anotherTest.png)

To test this, we need to check that the minimum height of the riders is only calculated when the ride in the ride order has a minimum height. This can be accomplished by adding the following test:

```
  it('should not calculate min height if there is not a ride min height', () => {
        const actualSummary = ridesSummary(
      createRideOrder({
        people: [
          createPerson({ height: 10 }),
          createPerson({ height: 50 }),
          createPerson({ height: 20 }),
        ],
      }),
    );
    expect(actualSummary).not.toContain('>= 10');
  })
```
After adding these tests, we have increased our confidence in the test, we know that more important cases have been covered. After running Stryker again, the new table shows that the mutant score for this file has increased to 83.33.

## Conclusion

Having confidence in your tests along with high code coverage can greatly increase your confidence in your code. Mutation testing may not be as beneficial to an experienced engineer who knows what edge cases to think of when writing tests, a tool like Stryker can be very helpful to newer developers (and it can still be beneficial to the experienced). It can help improve your test-writing skills, as well as find issues in existing tests. 
