# location: tests_keyword_driven/projects/myProjectA/features/example11-api-curl-templates.feature
#
# Demonstrates calling a raw .curl template (curl-templates/fixture/echo.curl)
# against a small local fixture server (fixtures/api-fixture-server.js,
# started automatically by playwright.config.ts's webServer option) instead
# of a real backend - keeps this example self-contained like every other one
# in this file, no internet or real project's API required.
#
# "I curl template" works like every other step in this framework:
# every variable currently set in the test is available to the template as
# +var(name) (see Object.fromEntries(vars) in curl.steps.ts), and the
# captured response is just a variable, asserted on with the same
# "I should/should not see variable ... is/contains" steps used everywhere.


@featureName.example11-api-curl-templates @featureArea.keywordTest @exampleTests
Feature: Example — calling a curl template and asserting on the response

  @scenarioName.example.curlTemplate.echo
  Scenario: Variables set earlier in the test are available to the curl template
    Given I set variable "username" to "exampleUser123"
    And I set variable "message" to "hello from the test"

    When I curl template "fixture/echo" into variable "echoResponse"
    Then I should see variable "echoResponse.status" is "200"
    And I should see variable "echoResponse" contains "exampleUser123"
    And I should see variable "echoResponse" contains "hello from the test"
    And I should not see variable "echoResponse" contains "error"
    When I spit "echo response was: +var(echoResponse)"

  @scenarioName.example.curlTemplate.differentValues
  Scenario: A second call with different variables gets a different echoed response
    Given I set variable "username" to "someoneElse"
    And I set variable "message" to "a different message"

    When I curl template "fixture/echo" into variable "echoResponse"
    Then I should see variable "echoResponse" contains "someoneElse"
    And I should not see variable "echoResponse" contains "exampleUser123"

  # "I curl template ... into variable ..." always authenticates as
  # the automation account (getAutomationApiContext() - the one shared,
  # cached context every other call in this file re-uses). "... as user ...
  # and pass ..." instead opens a fresh, one-shot context as whoever you
  # give it - for calling a REAL endpoint as whichever real user already
  # has the permission it needs (a moderator, a team owner, etc), instead
  # of adding a test-only backend endpoint for every permission a test
  # happens to need. auth/login.curl + fixture/whoami.curl exist purely to
  # prove this against something real: two fake accounts (reusing the
  # generic _AUTOMATION_API_USERNAME1/_SUPER_ADMIN_USERNAME1 credentials
  # already defined in config/local.env), a login that sets a session
  # cookie, and a whoami that reads it back.
  @scenarioName.example.curlTemplate.asUser
  Scenario: The same template authenticates as whichever user you call it with
    When I curl template "fixture/whoami" into variable "whoamiDefault"
    Then I should see variable "whoamiDefault" contains "_AUTOMATION_API_USERNAME1"

    When I curl template "fixture/whoami" as user "_SUPER_ADMIN_USERNAME1" and pass "_SUPER_ADMIN_PASSWORD1" into variable "whoamiAsAdmin"
    Then I should see variable "whoamiAsAdmin" contains "_SUPER_ADMIN_USERNAME1"
    And I should not see variable "whoamiAsAdmin" contains "_AUTOMATION_API_USERNAME1"
