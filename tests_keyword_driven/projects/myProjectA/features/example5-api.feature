# location: tests_keyword_driven/projects/myProjectA/features/examplfail.feature

@featureName.example5-api @featureArea.testapi @exampleApiTests
Feature: Example: API login and the test-automation endpoint
  Needs the app API and the /test-automation endpoint running, plus _API_URL,
  _AUTOMATION_API_USERNAME and _AUTOMATION_API_PASSWORD in config/<env>.env.

  @scenarionName.exampleapi.login
  Scenario: Logging in through a curl template
    When I call curl template "auth/login" into variable "loginResponse"
    Then I should see variable "loginResponse.status" is "200"
    When I spit "+var(loginResponse)"

  @scenarionName.exampleapi.countusers
  Scenario: Counting users through the test-automation endpoint
    When I db api count "ds_core_users" rows where column "username" is "_AUTOMATION_API_USERNAME" into variable "userCount"
    When I spit "automation users found: +var(userCount)"
    Then I should see variable "userCount" is "1"