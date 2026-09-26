# location: tests_keyword_driven/projects/myProjectA/features/example6-funtions.feature
#
# Demonstrates the +func(...) data-generator/transform family (see
# tests_keyword_driven/generic/support/dataFunctions.ts) - composable,
# e.g. +lower(+randalpha(8)). Deterministic ones are asserted directly;
# random ones have nothing fixed to assert against, so they're just spit
# to the console instead, same idea as "print it so you can see it worked".
# Runs entirely against no page/app at all - this only exercises string
# resolution, nothing else.

@featureName.example6-funtions @featureArea.dataFunctions @exampleTests
Feature: Composable data functions

  @scenarioName.example.dataFunctions.deterministic
  Scenario: Case and character-class transforms are deterministic
    Given I set variable "lowered" to "+lower('Str')"
    Then I should see variable "lowered" is "str"

    Given I set variable "uppered" to "+upper('Str')"
    Then I should see variable "uppered" is "STR"

    Given I set variable "alphaOnly" to "+alpha('str894dd')"
    Then I should see variable "alphaOnly" is "strdd"

    Given I set variable "numericOnly" to "+numeric('a1b2c3')"
    Then I should see variable "numericOnly" is "123"

    Given I set variable "alphanumericOnly" to "+alphanumeric('a1!b2@c3#')"
    Then I should see variable "alphanumericOnly" is "a1b2c3"

  @scenarioName.example.dataFunctions.random
  Scenario: Random generators - nothing fixed to assert, so spit them
    When I spit "randalpha(6):          +randalpha(6)"
    And I spit "randalpha() default 10: +randalpha()"
    And I spit "randnumeric(6):         +randnumeric(6)"
    And I spit "randalphanumeric(8):    +randalphanumeric(8)"
    And I spit "randhex(6):             +randhex(6)"
    And I spit "bare uuid:              +uuid"
    And I spit "uuid():                +uuid()"

  @scenarioName.example.dataFunctions.composable
  Scenario: Functions nest - the argument is resolved innermost-first
    Given I set variable "username" to "randalpha_demo"
    When I spit "lower(randalpha(8)):   +lower(+randalpha(8))"
    And I spit "upper(var(username)):   +upper(+var(username))"
    And I spit "numeric(uuid):          +numeric(+uuid)"
