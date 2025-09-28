import { Linking, Alert } from 'react-native';

interface WhatsAppConfig {
  supportNumber: string;
  businessName: string;
  supportHours: string;
}

const config: WhatsAppConfig = {
  supportNumber: '+911234567890', // Replace with your actual WhatsApp Business number
  businessName: 'SmartBag Support',
  supportHours: 'Mon-Fri, 9 AM - 6 PM',
};

export class WhatsAppUtils {
  /**
   * Open WhatsApp chat with support for a specific ticket
   */
  static async openSupportChat(ticketId: string, subject?: string, category?: string) {
    try {
      const message = this.createTicketMessage(ticketId, subject, category);
      await this.openWhatsApp(message);
    } catch (error) {
      console.error('WhatsApp error:', error);
      this.showWhatsAppError();
    }
  }

  /**
   * Open WhatsApp chat with general support message
   */
  static async openGeneralSupport(message?: string) {
    try {
      const defaultMessage = message || this.createGeneralSupportMessage();
      await this.openWhatsApp(defaultMessage);
    } catch (error) {
      console.error('WhatsApp error:', error);
      this.showWhatsAppError();
    }
  }

  /**
   * Open WhatsApp chat with order-related support
   */
  static async openOrderSupport(orderId: string, issue?: string) {
    try {
      const message = this.createOrderSupportMessage(orderId, issue);
      await this.openWhatsApp(message);
    } catch (error) {
      console.error('WhatsApp error:', error);
      this.showWhatsAppError();
    }
  }

  /**
   * Open WhatsApp chat with delivery-related support
   */
  static async openDeliverySupport(orderId: string, deliveryIssue?: string) {
    try {
      const message = this.createDeliverySupportMessage(orderId, deliveryIssue);
      await this.openWhatsApp(message);
    } catch (error) {
      console.error('WhatsApp error:', error);
      this.showWhatsAppError();
    }
  }

  /**
   * Core WhatsApp opening logic
   */
  private static async openWhatsApp(message: string) {
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `whatsapp://send?phone=${config.supportNumber}&text=${encodedMessage}`;
    
    // Check if WhatsApp is available
    const canOpen = await Linking.canOpenURL(whatsappUrl);
    
    if (canOpen) {
      await Linking.openURL(whatsappUrl);
    } else {
      // Fallback to web WhatsApp
      const webWhatsAppUrl = `https://wa.me/${config.supportNumber.replace('+', '')}?text=${encodedMessage}`;
      await Linking.openURL(webWhatsAppUrl);
    }
  }

  /**
   * Create support message for specific ticket
   */
  private static createTicketMessage(ticketId: string, subject?: string, category?: string): string {
    const timestamp = new Date().toLocaleString('en-IN');
    
    return `Hi ${config.businessName}! 👋

I need assistance with my support ticket:

📋 *Ticket ID:* #${ticketId.slice(-8).toUpperCase()}
${subject ? `📝 *Subject:* ${subject}` : ''}
${category ? `📂 *Category:* ${category.replace('_', ' ').toUpperCase()}` : ''}
⏰ *Time:* ${timestamp}

I'm reaching out for additional help with this issue. Please assist me.

Thank you!`;
  }

  /**
   * Create general support message
   */
  private static createGeneralSupportMessage(): string {
    const timestamp = new Date().toLocaleString('en-IN');
    
    return `Hi ${config.businessName}! 👋

I need help with my SmartBag account.

⏰ *Time:* ${timestamp}
📱 *App:* SmartBag Food Delivery

Could you please assist me?

Thank you!`;
  }

  /**
   * Create order-specific support message
   */
  private static createOrderSupportMessage(orderId: string, issue?: string): string {
    const timestamp = new Date().toLocaleString('en-IN');
    
    return `Hi ${config.businessName}! 👋

I need help with my order:

🛍️ *Order ID:* #${orderId.slice(-8).toUpperCase()}
${issue ? `❓ *Issue:* ${issue}` : ''}
⏰ *Time:* ${timestamp}

Please help me resolve this order issue.

Thank you!`;
  }

  /**
   * Create delivery-specific support message
   */
  private static createDeliverySupportMessage(orderId: string, deliveryIssue?: string): string {
    const timestamp = new Date().toLocaleString('en-IN');
    
    return `Hi ${config.businessName}! 👋

I need help with my delivery:

🚚 *Order ID:* #${orderId.slice(-8).toUpperCase()}
${deliveryIssue ? `⚠️ *Issue:* ${deliveryIssue}` : ''}
⏰ *Time:* ${timestamp}

My delivery seems to have an issue. Please assist.

Thank you!`;
  }

  /**
   * Show error when WhatsApp is not available
   */
  private static showWhatsAppError() {
    Alert.alert(
      'WhatsApp Not Available',
      `WhatsApp is not available on this device. You can still contact our support team:
      
📞 Phone: ${config.supportNumber}
📧 Email: support@smartbag.com
⏰ Hours: ${config.supportHours}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call Support', 
          onPress: () => Linking.openURL(`tel:${config.supportNumber}`)
        },
        { 
          text: 'Send Email', 
          onPress: () => Linking.openURL('mailto:support@smartbag.com')
        }
      ]
    );
  }

  /**
   * Check if WhatsApp is available on the device
   */
  static async isWhatsAppAvailable(): Promise<boolean> {
    try {
      const whatsappUrl = 'whatsapp://send';
      return await Linking.canOpenURL(whatsappUrl);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get support contact information
   */
  static getSupportInfo(): WhatsAppConfig {
    return { ...config };
  }

  /**
   * Update support configuration
   */
  static updateConfig(newConfig: Partial<WhatsAppConfig>) {
    Object.assign(config, newConfig);
  }
}