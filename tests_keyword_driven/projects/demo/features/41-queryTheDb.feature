# location: tests_keyword_driven/projects/demo/features/41-queryTheDb.feature
# ./run-tests.sh env=demo headed=true speed=slow debug-mode=all tags=@demoRegister41
# ./run-tests.sh env=emo @tags=demoRegister41
# ./run-tests.sh env=demo

@demoRegister41
Feature: User registration
  As a new user
  I want to register an account
  So that I can access the application and use its features


  Scenario: A new user successfully registers for an account

    # we will add somemthing like ths eventually: 
    # Given I curl delete user data for email contains "bob41@_AUTO_USER_EMAIL_DOMAIN"

    Given I curl register username "myNameIsBob41" email "bob41@_AUTO_USER_EMAIL_DOMAIN" and pass "_AUTO_USER_PASS"

    # When I go to "_APP_URL/auth?mode=register"
    # And I set field "Username" to "myNameIsBob41"
    # And I set field "Email" to "bobsemail41@_AUTO_USER_EMAIL_DOMAIN"
    # And I set field "Password" to "bobs41InsecurePassword"
    # And I click "Yes"
    # And I click "I confirm I am over 18"
    # And I click "I agree to the"
    # And I click any "Accept all cookies"
    # And I click "role:button:Register"
    # Then I should see viewport text "Welcome"


    When I db get newest row "ds_core_users" where column "email" like "bob41@_AUTO_USER_EMAIL_DOMAIN" into variable "row"
    And I spit "+var(row)"

    And I set variable "userId" to "+var(row.user_id)"
    And I set variable "username" to "+var(row.username)" 
    And I spit "+var(userId)"

    # now we can query the database and get the user id, we can add a clean up that affectively deletes the user
    # and we can do this in one line, and make it so that it doesnt throw if the user does / doesnt exist
    

    # now that we have the id, delete the user for real via whatever delete endpoint your site already has
    # You will need to change this, I have only added this as an example:  - demo/curl-templates/member/delete.curl is

    When I curl template "member/delete" as user "_SUPER_ADMIN_USERNAME1" and pass "_SUPER_ADMIN_PASSWORD1" into variable "deleteResponse"
    Then I should see variable "deleteResponse" contains "flagged for deletion"

    # for my site, I also needed a hard delete:
    When I curl template "member/hard-delete" as user "_SUPER_ADMIN_USERNAME1" and pass "_SUPER_ADMIN_PASSWORD1" into variable "deleteResponse"
    Then I should see variable "deleteResponse" contains "deleted"

    # now we will clean the delete step up and run this as the start of the test:
    # Given I curl delete user data for email contains "bob41@_AUTO_USER_EMAIL_DOMAIN"