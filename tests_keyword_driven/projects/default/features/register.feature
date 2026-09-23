# location: tests_keyword_driven/projects/myProjectA/features/register.feature

@register
Feature: User registration

  @newUserRegister
  Scenario: A new user can register
    Given I set variable "username" to "username1_+var(browserName)"
    And I set variable "email" to "testprefix++var(username)@example.com"
    And I set variable "password" to "testPassword123!"
    And I clean up user data for email "+var(email)"

    When I go to "http://localhost:5173/auth?mode=register"
    And I set field "css:input[type='text']" to "+var(username)"
    And I set field "css:input[type='email']" to "+var(email)"
    And I set field "role:textbox:Password" to "+var(password)"
    And I click "role:radio:Yes"
    And I click "role:checkbox:I confirm I am over 18"
    And I click "role:checkbox:I agree to the"
    And I click "role:button:Accept all cookies"
    And I click "role:button:Register"
    Then I should see element "css:h1" contains text "Welcome"


  @duplicateEmailRegister
  Scenario: Registering with an already-used email shows an error
    Given I set variable "username" to "username2_+var(browserName)"
    And I set variable "email" to "testprefix++var(username)@example.com"
    And I set variable "password" to "testPassword123!"
    And I clean up user data for email "+var(email)"

    When I go to "http://localhost:5173/auth?mode=register"
    And I set field "css:input[type='text']" to "+var(username)"
    And I set field "css:input[type='email']" to "+var(email)"
    And I set field "role:textbox:Password" to "+var(password)"
    And I click "role:radio:Yes"
    And I click "role:checkbox:I confirm I am over 18"
    And I click "role:checkbox:I agree to the"
    And I click "role:button:Accept all cookies"
    And I click "role:button:Register"
    Then I should see element "css:h1" contains text "Welcome"

    When I click "role:button:+var(username)"
    And I click "role:link:Log Out"
    Then I should see element "role:link:Login"

    When I go to "http://localhost:5173/auth?mode=register"
    And I set field "css:input[type='text']" to "+var(username)"
    And I set field "css:input[type='email']" to "+var(email)"
    And I set field "role:textbox:Password" to "+var(password)"
    And I click "role:radio:Yes"
    And I click "role:checkbox:I confirm I am over 18"
    And I click "role:checkbox:I agree to the"
    And I click "role:button:Register"
    Then I should not see element "css:h1" contains text "Welcome"   