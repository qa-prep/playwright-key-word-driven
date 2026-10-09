# location: tests_keyword_driven/projects/demo/features/100-finalRegistration.feature
# ./run-tests.sh project=demo headed=true speed=slow debug-mode=all tags=@demoLogin1
# ./run-tests.sh project=demo tags=@demoLogin1
# ./run-tests.sh env=demo

# Same scenario as registration.feature, except the cleanup curl call is
# shown explicitly instead of hidden behind "I clean up user data for email
# ...". This needs one small test-automation endpoint added to your
# application (gated to non-production environments) - see
# test-automation/delete-user-by-email.curl and TestAutomationController in
# dash-sites-creator for a reference implementation. Unlike an approach
# built on your app's own admin panel, this doesn't depend on your site
# having any particular admin-panel shape - just the one endpoint.

@demoLogin1
Feature: User Login
  As a new user
  I want to login to my account
  So that I can access the application and use its features

  Scenario: Using a bulk user login to your account

    When I go to "_APP_URL/auth?mode=login"
    And I set field "Username" to "teamAutoGenUser1"
    And I set field "Password" to "_AUTO_USER_PASS"
    And I click "role:button:Login"
    Then I should see viewport text "Welcome"


