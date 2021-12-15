# Client integration tests notes

## How to determine if a button is enabled or disabled

Concerning the element `.toBeDisabled` and `.toBeEnabled` assertions.<br/>
We're following a global rule:

-   `element.toBeDisabled` checks the element and his parent.
-   `element.toBeEnabled` checks the element only

We prefer checking the element and it's parents, then we will using `element.toBeDisabled` only.<br/>
In this way to check if an element is enabled we will use `element.not.disabled`

## Using waitFor

You should not use `expect(element).find*` method inside a `waitFor` assertion.<br/>
It achieve to a nested `waitFor` assertion that will lead to unexpected test behaviour.<br/>
You should either use `expect(element).find*` alone in the upper block.<br/>
Or use an `expect(element).get*` sync method to retrieve the element you wanna test.<br/>
