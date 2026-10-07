# location: tests_keyword_driven/projects/myProjectA/features/example12-database.feature
# ./run-tests.sh project=myProjectA tags=@example12 debug-mode=all headed=true speed=slow
# ./run-tests.sh project=myProjectA tags=@example12 
# ./run-tests.sh project=myProjectA tags=@exampleTests

# Demonstrates "I db ..." (database.steps.ts) - direct MySQL access via
# _DB_HOST/_DB_PORT/_DB_NAME/_DB_USER/_DB_PASSWORD in your env file, no
# backend endpoint required at all. Same verbs/semantics as
# test-automation-api.steps.ts's "I api ..." family (example11's
# "I curl template" steps go through an HTTP endpoint instead) - pick
# whichever matches what you actually have: "I api ..." if a dev added a
# test-automation endpoint to the app, "I db ..." if you'd rather just
# connect straight to the database yourself.
#
# Deliberately NOT tagged @exampleTests - unlike every other example in this
# project, this one needs a real, reachable database with a real table in
# it, which myProjectA's config doesn't set up by default. Fill in the
# _DB_* values in your own env file and point table_name/column names below
# at a real table before running this with tags=@exampleDbTests.

@featureName.example12-database @featureArea.keywordTest @exampleDbTests @example12 
Feature: Example — querying and modifying a real database table directly

  @scenarioName.example.database.countAndGetNewest
  Scenario: Count matching rows and fetch the newest one's column value
    Given I set variable "email" to "exampleUser123@example.com"

    When I db count "example_users" rows where column "email" is "+var(email)" into variable "exactCount"
    Then I should see variable "exactCount" is "1"

    When I db count "example_users" rows where column "email" like "exampleUser" into variable "likeCount"
    Then I should see variable "likeCount" is "1"

    When I db get newest "example_users" column "user_id" where column "email" is "+var(email)" into variable "userId"
    And I db get newest "example_users" column "user_id" where column "email" like "exampleUser" into variable "userIdViaLike"
    Then I should see variable "userId" is "+var(userIdViaLike)"

  @scenarioName.example.database.updateAndDelete
  Scenario: Update a column, then clean the row up afterwards
    When I db update table "example_users" column "status" where "email" is "exampleUser123@example.com" to value "active"
    And I db count "example_users" rows where column "status" is "active" into variable "activeCount"
    Then I should see variable "activeCount" is "1"

    When I db delete row "example_users" where "email" is "exampleUser123@example.com"
    And I db count "example_users" rows where column "email" is "exampleUser123@example.com" into variable "remainingCount"
    Then I should see variable "remainingCount" is "0"
