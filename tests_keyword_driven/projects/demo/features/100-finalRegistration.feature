# location: tests_keyword_driven/projects/demo/features/100-finalRegistration.feature
# ./run-tests.sh project=demo headed=true speed=slow debug-mode=all tags=@demoRegiste100
# ./run-tests.sh project=demo tags=@demoRegiste100
# ./run-tests.sh env=demo

# Same scenario as registration.feature, except the cleanup curl call is
# shown explicitly instead of hidden behind "I clean up user data for email
# ...". This needs one small test-automation endpoint added to your
# application (gated to non-production environments) - see
# test-automation/delete-user-by-email.curl and TestAutomationController in
# dash-sites-creator for a reference implementation. Unlike an approach
# built on your app's own admin panel, this doesn't depend on your site
# having any particular admin-panel shape - just the one endpoint.

@demoRegiste100
Feature: User registration (step by step cleanup)
  As a new user
  I want to register an account
  So that I can access the application and use its features

  Scenario: A new user successfully registers for an account

    Given I curl delete user data for email contains "bob-final@_AUTO_USER_EMAIL_DOMAIN"
    # And I curl register username "bob-final" email "bob-final@_AUTO_USER_EMAIL_DOMAIN" and pass "_AUTO_USER_PASS"

    When I go to "_APP_URL/auth?mode=register"
    And I set field "Username" to "bob-final"
    And I set field "Email" to "bob-final@_AUTO_USER_EMAIL_DOMAIN"
    And I set field "Password" to "_AUTO_USER_PASS"
    And I click "Yes"
    And I click "I confirm I am over 18"
    And I click "I agree to the"
    And I click any "Accept all cookies"
    And I click "role:button:Register"
    Then I should see viewport text "Welcome"

