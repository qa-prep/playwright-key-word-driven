# location: tests_keyword_driven/projects/myProjectA/features/example11-api-curl-templates.feature
#
# Demonstrates calling a raw .curl template (curl-templates/fixture/echo.curl)
# against a small local fixture server (fixtures/api-fixture-server.js,
# started automatically by playwright.config.ts's webServer option) instead
# of a real backend - keeps this example self-contained like every other one
# in this file, no internet or real project's API required.
#
# "I call curl template" works like every other step in this framework:
# every variable currently set in the test is available to the template as
# +var(name) (see Object.fromEntries(vars) in curl.steps.ts), and the
# captured response is just a variable, asserted on with the same
# "I should/should not see variable ... is/contains" steps used everywhere.
#
# Supersedes the old example5-api.feature, which needed a real project's
# backend (_API_URL, a live /login, a live /test-automation endpoint) just
# to demonstrate a generic framework mechanic - not actually generic. The
# one thing from it not reproduced here is "I api count ... into variable"
# (database.ts) - that step counts real rows in a real table, which only
# means something against an actual backend, so it's demonstrated for real
# in the dash-sites project's own tests instead of faked here.

@featureName.example11-api-curl-templates @featureArea.keywordTest @exampleTests
Feature: Example — calling a curl template and asserting on the response

  @scenarioName.example.curlTemplate.echo
  Scenario: Variables set earlier in the test are available to the curl template
    Given I set variable "username" to "exampleUser123"
    And I set variable "message" to "hello from the test"

    When I call curl template "fixture/echo" into variable "echoResponse"
    Then I should see variable "echoResponse.status" is "200"
    And I should see variable "echoResponse" contains "exampleUser123"
    And I should see variable "echoResponse" contains "hello from the test"
    And I should not see variable "echoResponse" contains "error"
    When I spit "echo response was: +var(echoResponse)"

  @scenarioName.example.curlTemplate.differentValues
  Scenario: A second call with different variables gets a different echoed response
    Given I set variable "username" to "someoneElse"
    And I set variable "message" to "a different message"

    When I call curl template "fixture/echo" into variable "echoResponse"
    Then I should see variable "echoResponse" contains "someoneElse"
    And I should not see variable "echoResponse" contains "exampleUser123"
