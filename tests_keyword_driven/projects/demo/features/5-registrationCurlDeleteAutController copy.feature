# location: tests_keyword_driven/projects/demo/features/registrationStepByStep.feature
# ~/projects/dash-sites-tests/run-tests.sh project=demo headed=true speed=slow debug-mode=all @tags=@demoRegister5
# ~/projects/dash-sites-tests/run-tests.sh project=demo @tags=@demoRegister5
# run-tests.sh env=demoenv

# Same scenario as registration.feature, except the cleanup curl call is
# shown explicitly instead of hidden behind "I clean up user data for email
# ...". This needs one small test-automation endpoint added to your
# application (gated to non-production environments) - see
# test-automation/delete-user-by-email.curl and TestAutomationController in
# dash-sites-creator for a reference implementation. Unlike an approach
# built on your app's own admin panel, this doesn't depend on your site
# having any particular admin-panel shape - just the one endpoint.

@demoRegister5
Feature: User registration (step by step cleanup)
  As a new user
  I want to register an account
  So that I can access the application and use its features

  @demoUserRegisterStepByStep
  Scenario: A new user successfully registers for an account

    # the test-automation endpoint takes a single JSON body - this is the
    # exact raw request "I clean up user data for email ..." sends under
    # the hood, just not hidden behind that step.
    Given I set variable "body" to "{\"email\":\"bobsemail@example.com\"}"
    When I curl template "test-automation/delete-user-by-email" into variable "deleteResponse"
    Then I should see variable "deleteResponse" contains "success"

    When I go to "http://localhost:8082/auth?mode=register"
    And I set field "Username" to "myNameIsBob"
    And I set field "Email" to "bobsemail@example.com"
    And I set field "Password" to "bobsInsecurePassword"
    And I click "Yes"
    And I click "I confirm I am over 18"
    And I click "I agree to the"
    And I click any "Accept all cookies"
    And I click "role:button:Register"
    Then I should see viewport text "Welcome"
