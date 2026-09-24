# location: tests_keyword_driven/projects/myProjectA/features/examplfail.feature

@featureName.example4-vars @featureArea.fail @exampleFailTests 
Feature: error handling
  Covers asserting and failing steps

  @scenarionName.example.tokens
  Scenario: Using +var() and _ENV tokens in steps
    Given I set variable "who" to "mike"
    And I set variable "greeting" to "hello +var(who)"
    When I spit "+var(greeting)"
    Then I should see variable "greeting" is "hello mike"

    Given I set variable "loginUrl" to "_API_URL/login"
    When I spit "+var(loginUrl)"
    Then I should see variable "loginUrl" contains "://"
    And I should see variable "loginUrl" contains "/login"

    Given I set variable "both" to "+var(who) logs in at _API_URL/login"
    Then I should see variable "both" contains "mike logs in at http"