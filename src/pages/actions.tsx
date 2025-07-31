import { actions, useAppBridge } from "@saleor/app-sdk/app-bridge";
import { Box, Button, Text } from "@saleor/macaw-ui";
import { useState } from "react";

import { OrderExample } from "../order-example";
import { RazorpayComponent } from "../components/RazorpayComponent";

/**
 * This is example of using AppBridge, when App is mounted in Dashboard
 * See more about AppBridge possibilities
 * https://github.com/saleor/app-sdk/blob/main/docs/app-bridge.md
 *
 * -> You can safely remove this file!
 */
const ActionsPage = () => {
  const { appBridge, appBridgeState } = useAppBridge();
  const [paymentStatus, setPaymentStatus] = useState<string>("");

  const navigateToOrders = () => {
    appBridge?.dispatch(
      actions.Redirect({
        to: `/orders`,
      })
    );
  };

  const handlePaymentSuccess = (result: any) => {
    setPaymentStatus("Payment initialized successfully!");
    console.log("Payment success:", result);
  };

  const handlePaymentError = (error: string) => {
    setPaymentStatus(`Payment failed: ${error}`);
    console.error("Payment error:", error);
  };

  return (
    <Box padding={8} display={"flex"} flexDirection={"column"} gap={6} __maxWidth={"640px"}>
      <Box>
        <Text as={"p"}>
          <b>Welcome {appBridgeState?.user?.email}!</b>
        </Text>
        <Text as={"p"}>Installing the app in the Dashboard gave it superpowers such as:</Text>
      </Box>
      
      <Box>
        <Text as={"h2"} size={8} marginBottom={2}>
          Razorpay Payment Gateway
        </Text>
        <Text color="default2">
          💡 Test the Razorpay payment gateway integration. This component demonstrates how to integrate Razorpay payments in your frontend.
        </Text>
        <Box marginY={4}>
          <RazorpayComponent 
            checkoutId="test-checkout-123"
            amount={1000} // 10 INR in paise
            currency="INR"
            customer={{
              name: "John Doe",
              email: "john@example.com",
              contact: "+919999999999"
            }}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        </Box>
        {paymentStatus && (
          <Box 
            backgroundColor={paymentStatus.includes("failed") ? "critical1" : "success1"}
            padding={4}
            borderRadius={4}
            marginTop={2}
          >
            <Text color="default1">{paymentStatus}</Text>
          </Box>
        )}
      </Box>
      
      <Box>
        <Text as={"h2"} size={8} marginBottom={2}>
          AppBridge actions
        </Text>
        <Text color="default2">
          💡 You can use AppBridge to trigger dashboard actions, such as notifications or redirects.
        </Text>
        <Box display={"flex"} gap={4} gridAutoFlow={"column"} marginY={4}>
          <Button
            variant={"secondary"}
            onClick={() => {
              appBridge?.dispatch({
                type: "notification",
                payload: {
                  status: "success",
                  title: "You rock!",
                  text: "This notification was triggered from Saleor App",
                  actionId: "message-from-app",
                },
              });
            }}
          >
            Trigger notification 📤
          </Button>
          <Button variant={"secondary"} onClick={navigateToOrders}>
            Redirect to orders ➡️💰
          </Button>
        </Box>
      </Box>
      <OrderExample />
      <Box display="flex" flexDirection={"column"} gap={2}>
        <Text as={"h2"} size={8}>
          Webhooks
        </Text>
        <Text>
          The App Template contains an example <code>ORDER_CREATED</code> webhook under the path{" "}
          <code>src/pages/api/order-created</code>.
        </Text>
        <Text as="p">
          Create any{" "}
          <Text
            as={"a"}
            fontWeight="bold"
            size={4}
            onClick={navigateToOrders}
            cursor={"pointer"}
            color={"info1"}
          >
            Order
          </Text>{" "}
          and check your console output!
        </Text>
      </Box>
    </Box>
  );
};

export default ActionsPage;
