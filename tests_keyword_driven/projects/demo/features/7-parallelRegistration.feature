# location: tests_keyword_driven/projects/dash-sites/features/register/register.feature
# ~/projects/dash-sites-tests/run-tests.sh project=demo headed=true speed=vslow debug-mode=all @tags=@demoRegister

@demoRegister3
Feature: User registration

  # If you are running parallel registration tests with different browser, 
  # if you tests use the same username / email you'll hit duplicate (already registerd) issues
  # One way to solve this, that is still be deterministic, is to either add the worker index, 
  # better still (since you know exactly which browser was used from the user data), the browser name like I have done below
  

  Scenario: A new user can register
    Given I set variable "username" to "username1_+var(browserName)"
    And I set variable "email" to "testprefix++var(username)@_AUTO_USER_EMAIL_DOMAIN"
    And I set variable "password" to "+randalphanumeric(8)73sT!"
    And I clean up user data for email "+var(email)"

    When I go to "_APP_URL/auth?mode=register"
    And I set field "Username" to "+var(username)"
    And I set field "Email" to "+var(email)"
    And I set field "Password" to "+var(password)"
    And I click "Yes"
    And I click "I confirm I am over 18"
    And I click "I agree to the"
    And I click any "Accept all cookies"
    And I click "role:button:Register"
    Then I should see viewport text "Welcome"


  