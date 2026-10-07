# location: tests_keyword_driven/projects/myProjectA/features/example6-funtions.feature
# ./run-tests.sh project=myProjectA tags=@example6 debug-mode=all headed=true speed=slow
# ./run-tests.sh project=myProjectA tags=@example6 
# ./run-tests.sh project=myProjectA tags=@exampleTests


# Demonstrates the +func(...) data-generator/transform family (see
# tests_keyword_driven/generic/support/dataFunctions.ts) - composable,
# e.g. +lower(+randalpha(8)). Deterministic ones are asserted directly;
# random ones have nothing fixed to assert against, so they're just spit
# to the console instead, same idea as "print it so you can see it worked".
# Runs entirely against no page/app at all - this only exercises string
# resolution, nothing else.

@featureName.example6-funtions @featureArea.dataFunctions @exampleTests @example6
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
    And I spit "rand(7):                +rand(7)"
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

  # +date() - the first argument is an offset from now ("0"/empty means no offset), the second SimpleDateFormat-style pattern 
  # (yyyy, MM, dd, HH, mm, ss; 'literal text' passes through unchanged). 
  # see https://docs.oracle.com/javase/7/docs/api/java/text/SimpleDateFormat.html
  @scenarioName.example.dataFunctions.date
  Scenario: +date() and +unixtimestamp() - offsets and formats from now
    When I spit "now, default format (yyyy-MM-dd):  +date()"
    And I spit "now, explicit 0:                     +date(0)"
    And I spit "now with a time format:               +date(0, yyyy-MM-dd HH:mm:ss)"
    And I spit "literal text in the pattern:          +date(0, yyyy/MM/dd 21:00 'sometext')"
    And I spit "time only:                            +date(0, HH:mm:ss)"
    And I spit "yesterday:                            +date(-1 day)"
    And I spit "tomorrow:                             +date(+1 day)"
    And I spit "1 year from now:                      +date(+1 year)"
    And I spit "1 day ago, date only:                 +date(-1 days, yyyy-MM-dd)"
    And I spit "1 year ago:                           +date(-1 year)"
    And I spit "367 days ago:                         +date(-367 days)"
    And I spit "5 hours ago:                          +date(-5 hours, yyyy-MM-dd HH:mm:ss)"
    And I spit "30 minutes ago, time only:             +date(-30 minutes, HH:mm:ss)"
    And I spit "30 seconds ago, time only:             +date(-30 seconds, HH:mm:ss)"
    # multiple offset spans combine - 1 year AND 5 days ago
    And I spit "1 year and 5 days ago:                 +date(-1 year -5 days, yyyy-MM-dd)"

    # seconds-since-epoch (matches PHP's time(), not JS's millisecond
    # Date.now()) - same offset syntax as +date()'s first argument, so
    # +unixtimestamp(-1 day) is "yesterday" as a raw timestamp instead of a
    # formatted string. Useful for seeding/asserting against timestamp
    # columns directly (eg. a DB column storing time()).
    When I spit "unix timestamp, now:                  +unixtimestamp()"
    And I spit "unix timestamp, this time yesterday:   +unixtimestamp(-1 day)"
