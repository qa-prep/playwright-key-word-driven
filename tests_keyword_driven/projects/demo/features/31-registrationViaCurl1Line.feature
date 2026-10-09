# location: tests_keyword_driven/projects/demo/features/31-registrationViaCurl1Line.feature
# ./run-tests.sh env=demo headed=true speed=slow debug-mode=all tags=@demoRegister31
# ./run-tests.sh env=emo @tags=demoRegister31
# ./run-tests.sh env=demo

@demoRegister31
Feature: User registration
  As a new user
  I want to register an account
  So that I can access the application and use its features


  Scenario: A new user successfully registers for an account

    # since we are now using env files, we can use underscore settings like _APP_URL

    # When I go to "_APP_URL/auth?mode=register"
    # And I set field "Username" to "myNameIsBob"
    # And I set field "Email" to "testprefix_bobsemail@_AUTO_USER_EMAIL_DOMAIN"
    # And I set field "Password" to "bobsInsecurePassword"
    # And I click "Yes"
    # And I click "I confirm I am over 18"
    # And I click "I agree to the"
    # And I click any "Accept all cookies"
    # And I click "role:button:Register"
    # Then I should see viewport text "Welcome"


    Given I curl register username "bob31" email "testprefix_bob31@_AUTO_USER_EMAIL_DOMAIN" and pass "_AUTO_USER_PASS"


    # but we're not finished yet, we need to clean up this user (at the start of the test), and we additional want a method to bulk create users
    # We can make this cucumber test much more readable
    