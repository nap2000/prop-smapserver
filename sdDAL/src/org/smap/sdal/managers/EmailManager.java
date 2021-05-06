package org.smap.sdal.managers;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Properties;
import java.util.ResourceBundle;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.activation.DataHandler;
import javax.activation.DataSource;
import javax.activation.FileDataSource;
import javax.mail.AuthenticationFailedException;
import javax.mail.BodyPart;
import javax.mail.Message;
import javax.mail.MessagingException;
import javax.mail.Multipart;
import javax.mail.PasswordAuthentication;
import javax.mail.Session;
import javax.mail.Transport;
import javax.mail.Message.RecipientType;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeBodyPart;
import javax.mail.internet.MimeMessage;
import javax.mail.internet.MimeMultipart;

import org.smap.sdal.Utilities.ApplicationException;
import org.smap.sdal.Utilities.GeneralUtilityMethods;
import org.smap.sdal.Utilities.UtilityMethodsEmail;
import org.smap.sdal.model.EmailServer;
import org.smap.sdal.model.Organisation;
import org.smap.sdal.model.SubscriptionStatus;

/*****************************************************************************

This file is part of SMAP.

SMAP is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

SMAP is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with SMAP.  If not, see <http://www.gnu.org/licenses/>.

 ******************************************************************************/

/*
 * Manage the sending of emails
 */
public class EmailManager {

	private static Logger log =
			Logger.getLogger(EmailManager.class.getName());

	LogManager lm = new LogManager();		// Application log
	
	/*
	 * Add an authenticator class
	 */
	private class Authenticator extends javax.mail.Authenticator {
		private PasswordAuthentication authentication;

		public Authenticator(String username, String password) {
			authentication = new PasswordAuthentication(username, password);
		}

		protected PasswordAuthentication getPasswordAuthentication() {
			return authentication;
		}
	}

	// Send an email
	public void sendEmail( 
			String email, 
			String password_uuid, 
			String type, 
			String subject,
			String content,
			String sender,
			String adminName,
			String interval,
			ArrayList<String> idents,
			String docURL,
			String filePath,	// The next two parameters are for an attachment TODO make an array
			String filename,
			String adminEmail,
			EmailServer emailServer,
			String scheme,
			String serverName,
			String emailKey,
			ResourceBundle localisation,
			String serverDescription,
			String organisationName) throws Exception  {

		if(emailServer.smtpHost == null) {
			throw new Exception("Cannot send email, smtp_host not available");
		}

		RecipientType rt = null;
		try {
			Properties props = System.getProperties();
			props.put("mail.smtp.host", emailServer.smtpHost);	

			Authenticator authenticator = null;

			// Create an authenticator if the user name and password is available
			if(emailServer.emailUser != null && emailServer.emailPassword != null 
					&& emailServer.emailUser.trim().length() > 0 
					&& emailServer.emailPassword.trim().length() > 0) {
				String authUser = emailServer.emailUser + "@" + emailServer.emailDomain;
				authenticator = new Authenticator(authUser, emailServer.emailPassword);
				props.setProperty("mail.smtp.submitter", authenticator.getPasswordAuthentication().getUserName());
				props.setProperty("mail.smtp.auth", "true");
				//props.setProperty("mail.smtp.starttls.enable", "true");
				if(emailServer.emailPort > 0) {
					props.setProperty("mail.smtp.port", String.valueOf(emailServer.emailPort));
				} else {
					props.setProperty("mail.smtp.port", "587");	
				}

				sender = emailServer.emailUser;

				log.info("Trying to send email with authentication");
			} else {
				if(emailServer.emailPort > 0) {
					props.setProperty("mail.smtp.port", String.valueOf(emailServer.emailPort));
				} else {
					// Use default port (25?)
				}
				log.info("No authentication");
			}

			props.setProperty("mail.smtp.connectiontimeout", "60000");
			props.setProperty("mail.smtp.timeout", "60000");
			props.setProperty("mail.smtp.writetimeout", "60000");
			Session session = Session.getInstance(props, authenticator);
			Message msg = new MimeMessage(session);
			if(type.equals("notify")) {
				rt = Message.RecipientType.BCC;
			} else {
				rt = Message.RecipientType.TO;
			}

			log.info("Sending to email addresses: " + email);
			InternetAddress[] emailArray = InternetAddress.parse(email);
			log.info("Number of email addresses: " + emailArray.length);
			msg.setRecipients(rt,	emailArray);
			msg.setSubject(subject);

			sender = sender + "@" + emailServer.emailDomain;

			log.info("Sending email from: " + sender);
			msg.setFrom(InternetAddress.parse(sender, false)[0]);

			StringBuffer identString = new StringBuffer();
			int count = 0;
			if(idents != null) {
				for(String ident : idents) {
					if(count++ > 0) {
						identString.append(" or ");
					} 
					identString.append(ident);
				}
			}


			StringBuffer txtMessage = new StringBuffer("");
			if(content != null && content.trim().length() > 0) {
				txtMessage.append(content);			// User has specified email content
				txtMessage.append("\n\n");

				// Add a link to the report if docURL is not null
				if(docURL != null) {
					txtMessage.append(scheme + "://");
					txtMessage.append(serverName);
					txtMessage.append(docURL);
				}
			} else if(type.equals("reset")) {
				txtMessage.append(localisation.getString("c_goto"));
				txtMessage.append(" " + scheme + "://");
				txtMessage.append(serverName);
				txtMessage.append("/resetPassword.html?token=");
				txtMessage.append(password_uuid);
				txtMessage.append(" ");
				txtMessage.append(localisation.getString("email_rp"));
				txtMessage.append("\n\n");
				txtMessage.append(localisation.getString("email_un"));
				txtMessage.append(": ");
				txtMessage.append(identString.toString());
				txtMessage.append("\n\n ");
				txtMessage.append(localisation.getString("email_vf"));
				txtMessage.append(" ");
				txtMessage.append(interval);
				txtMessage.append("\n ");
				txtMessage.append(localisation.getString("email_dnr"));
				txtMessage.append(" ");
				txtMessage.append(adminEmail);
				txtMessage.append(".");

			} else if(type.equals("notify")) {
				txtMessage.append(localisation.getString("email_ian"));
				txtMessage.append(" " + scheme + "://");
				txtMessage.append(serverName);
				txtMessage.append(". ");

				txtMessage.append(localisation.getString("email_dnr"));
				txtMessage.append(" ");
				txtMessage.append(adminEmail);
				txtMessage.append(".");	
				txtMessage.append("\n\n");
				if(docURL != null) {
					txtMessage.append(scheme + "://");
					txtMessage.append(serverName);
					txtMessage.append(docURL);
				}

			} else if(type.equals("subscribe")) {	// Email initiated by user
				txtMessage.append(localisation.getString("c_goto"));
				txtMessage.append(" " + scheme + "://");
				txtMessage.append(serverName);
				txtMessage.append("/subscriptions.html?subscribe=yes&token=");
				txtMessage.append(emailKey);
				txtMessage.append(" ");
				txtMessage.append(localisation.getString("email_s"));
				txtMessage.append("\n\n");
				txtMessage.append(localisation.getString("email_dnr"));
				txtMessage.append(" ");
				txtMessage.append(adminEmail);
				txtMessage.append(".");

			} else if(type.equals("optin")) {	
				String m = localisation.getString("c_opt_in_content"); 
				m = m.replace("%s1", organisationName + " (" + serverName + ")");
				txtMessage.append(m).append("\n");
				txtMessage.append(localisation.getString("c_goto"));
				txtMessage.append(" " + scheme + "://");
				txtMessage.append(serverName);
				txtMessage.append("/subscriptions.html?subscribe=yes&token=");
				txtMessage.append(emailKey);
				txtMessage.append(" ");
				txtMessage.append(localisation.getString("email_s"));
				txtMessage.append("\n\n");
				txtMessage.append(localisation.getString("email_dnr"));
				txtMessage.append(" ");
				txtMessage.append(adminEmail);
				txtMessage.append(".");

			} else if(type.equals("informational")) {
				
				txtMessage.append(content);
				txtMessage.append("\n\n");
				txtMessage.append(localisation.getString("email_dnr"));
				txtMessage.append(" ");
				txtMessage.append(adminEmail);
				txtMessage.append(".");

			}
			// Add unsubscribe
			if(emailKey != null) {
				
				txtMessage.append("\n\n\n\n");
				txtMessage.append(localisation.getString("c_unsubscribe"));
				txtMessage.append(": ");
				txtMessage.append(scheme + "://");
				txtMessage.append(serverName);
				txtMessage.append("/subscriptions.html?token=");
				txtMessage.append(emailKey);
			}
			
			BodyPart messageBodyPart = new MimeBodyPart();
			messageBodyPart.setText(txtMessage.toString());
			Multipart multipart = new MimeMultipart();
			multipart.addBodyPart(messageBodyPart);

			// Add file attachments if they exist
			if(filePath != null) {			 
				messageBodyPart = new MimeBodyPart();
				DataSource source = new FileDataSource(filePath);
				messageBodyPart.setDataHandler(new DataHandler(source));
				messageBodyPart.setFileName(filename);
				multipart.addBodyPart(messageBodyPart);
			}

			msg.setContent(multipart);

			msg.setHeader("X-Mailer", "msgsend");
			log.info("Sending email from: " + sender);
			Transport.send(msg);

		} catch(AuthenticationFailedException ae) { 
			log.log(Level.SEVERE, "Messaging Exception", ae);
			throw new Exception(localisation.getString("email_cs") + ":  " + localisation.getString("ae"));
		} catch(MessagingException me) {
			log.log(Level.SEVERE, "Messaging Exception", me);
			String msg = me.getMessage();
			throw new Exception(localisation.getString("email_cs") + ":  " + msg);
		}
	}
	
	/*
	 * Send an email alert to an administrator
	 */
	public void alertAdministrator(Connection sd, int oId, String userIdent, 
			ResourceBundle localisation,
			String serverName,
			String subject,
			StringBuilder template,
			String type) throws SQLException, ApplicationException {
		
		EmailManager em = new EmailManager();			
		EmailServer emailServer = null;
		SubscriptionStatus subStatus = null;
		StringBuilder content = null;
		HashMap<String, String> customTokens = new HashMap<> ();
		
		if(!alertEmailSent(sd, oId, type)) {
			Organisation org = GeneralUtilityMethods.getOrganisation(sd, oId);
			template = template.append(" ").append(org.getEmailFooter());
			content = new StringBuilder(template.toString());
			
			if(org.admin_email != null) {
				emailServer = UtilityMethodsEmail.getSmtpHost(sd, null, userIdent);
				if(emailServer.smtpHost != null) {
					
					PeopleManager pm = new PeopleManager(localisation);
					subStatus = pm.getEmailKey(sd, oId, org.getAdminEmail());
					if(subStatus.unsubscribed) {
						// Person has unsubscribed
						String msg = localisation.getString("email_us");
						msg = msg.replaceFirst("%s1", org.getAdminEmail());
						log.info(msg);
					} else {
						
						// Add custom tokens
						if(org.limits != null) {
							String submissionLimit = "0";
							try {
								submissionLimit = String.valueOf(org.limits.get(LogManager.SUBMISSION));
							} catch (Exception e) {}
							customTokens.put("${submission_limit}", submissionLimit);
						}
						
								
						// Catch and log exceptions
						try {
							em.sendEmailHtml(
									org.getAdminEmail(), 
									"bcc", 
									subject, 
									content, 
									null, 
									null, 
									emailServer,
									serverName,
									subStatus.emailKey,
									localisation,
									customTokens,
									null,
									null);
						} catch(Exception e) {
							lm.writeLogOrganisation(sd, oId, userIdent, LogManager.EMAIL, e.getMessage(), 0);
						}
					}
				}
			}
		}
	}
	
	// Send an email using HTML format
	public void sendEmailHtml( 
			String email, 
			String ccType, 
			String subject,
			StringBuilder template,
			String filePath,	// The next two parameters are for an attachment TODO make an array
			String filename,
			EmailServer emailServer,
			String serverName,
			String emailKey,
			ResourceBundle localisation,
			HashMap<String, String> tokens,
			String adminEmail,
			String orgFooter) throws Exception  {

		if(emailServer.smtpHost == null) {
			throw new Exception("Cannot send email, smtp_host not available");
		}

		RecipientType rt = null;
		String sender = "";
		try {
			Properties props = System.getProperties();
			props.put("mail.smtp.host", emailServer.smtpHost);	

			Authenticator authenticator = null;

			// Create an authenticator if the user name and password is available
			if(emailServer.emailUser != null && emailServer.emailPassword != null 
					&& emailServer.emailUser.trim().length() > 0 
					&& emailServer.emailPassword.trim().length() > 0) {
				String authUser = emailServer.emailUser + "@" + emailServer.emailDomain;
				authenticator = new Authenticator(authUser, emailServer.emailPassword);
				props.setProperty("mail.smtp.submitter", authenticator.getPasswordAuthentication().getUserName());
				props.setProperty("mail.smtp.auth", "true");
				//props.setProperty("mail.smtp.starttls.enable", "true");
				if(emailServer.emailPort > 0) {
					props.setProperty("mail.smtp.port", String.valueOf(emailServer.emailPort));
				} else {
					props.setProperty("mail.smtp.port", "587");	
				}

				sender = emailServer.emailUser;

				log.info("Trying to send email as html with authentication");
			} else {
				if(emailServer.emailPort > 0) {
					props.setProperty("mail.smtp.port", String.valueOf(emailServer.emailPort));
				} else {
					// Use default port (25?)
				}
				log.info("No authentication");
			}

			props.setProperty("mail.smtp.connectiontimeout", "60000");
			props.setProperty("mail.smtp.timeout", "60000");
			props.setProperty("mail.smtp.writetimeout", "60000");
			Session session = Session.getInstance(props, authenticator);
			Message msg = new MimeMessage(session);
			if(ccType.equals("bcc")) {
				rt = Message.RecipientType.BCC;
			} else {
				rt = Message.RecipientType.TO;
			}

			log.info("Sending to email addresses: " + email);
			InternetAddress[] emailArray = InternetAddress.parse(email);
			log.info("Number of email addresses: " + emailArray.length);
			msg.setRecipients(rt,	emailArray);
			msg.setSubject(subject);

			sender = sender + "@" + emailServer.emailDomain;

			log.info("Sending email from: " + sender);
			msg.setFrom(InternetAddress.parse(sender, false)[0]);
			
			if(adminEmail != null) {
				template.append("</p><p>")
					.append(localisation.getString("email_dnr"))
					.append(" ")
					.append(adminEmail)
					.append(".</p>");
			}
			if(orgFooter != null) {
				template.append(" ").append(orgFooter);
			}
			
			// Add unsubscribe
			StringBuffer unsubscribe = new StringBuffer();
			if(emailKey != null) {
				unsubscribe.append("<p style=\"color:blue;text-align:center;\">")
						.append("<a href=\"https://")
						.append(serverName)
						.append("/subscriptions.html?token=")
						.append(emailKey)
						.append("\">")
						.append(localisation.getString("c_unsubscribe"))
						.append("</a>")
						.append("</p>");		
						
				template.append(unsubscribe.toString());
			} 
			
			/*
			 * Perform custom token replacements
			 */
			String contentString = template.toString();
			if(tokens != null) {
				for(String token : tokens.keySet()) {
					String val = tokens.get(token);
					if(val == null) {
						val = "";
					}
					contentString = contentString.replace(token, val);
				}
			}
			
			Multipart multipart = new MimeMultipart();
			
			// Add body part
			MimeBodyPart messageBodyPart = new MimeBodyPart();
			messageBodyPart.setText(contentString, "utf-8", "html");
			multipart.addBodyPart(messageBodyPart);

			// Add file attachments if they exist
			if(filePath != null) {			 
				messageBodyPart = new MimeBodyPart();
				DataSource source = new FileDataSource(filePath);
				messageBodyPart.setDataHandler(new DataHandler(source));
				messageBodyPart.setFileName(filename);
				multipart.addBodyPart(messageBodyPart);
			}

			msg.setContent(multipart);

			msg.setHeader("X-Mailer", "msgsend");
			log.info("Sending email from: " + sender);
		
			Transport.send(msg);

		} catch(AuthenticationFailedException ae) { 
			log.log(Level.SEVERE, "Messaging Exception", ae);
			throw new Exception(localisation.getString("email_cs") + ":  " + localisation.getString("ae"));
		} catch(MessagingException me) {
			log.log(Level.SEVERE, "Messaging Exception", me);
			String msg = me.getMessage();
			throw new Exception(localisation.getString("email_cs") + ":  " + msg);
		}
	}
	
	boolean alertEmailSent(Connection sd, int oId, String type) throws SQLException {
		boolean sent = false;
		String sql = "select count(*) from email_alerts "
				+ "where o_id = ? "
				+ "and alert_type = ? "
				+ "and (alert_recorded > now() - interval '1 day')";
		PreparedStatement pstmt = null;
		
		String sqlDel = "delete from email_alerts "
				+ "where o_id = ? "
				+ "and alert_type = ?";
		PreparedStatement pstmtDel = null;
		
		String sqlAdd = "insert into email_alerts "
				+ "(o_id, alert_type, alert_recorded) values(?, ?, now())";
		PreparedStatement pstmtAdd = null;
		
		try {
			pstmt = sd.prepareStatement(sql);
			pstmt.setInt(1, oId);
			pstmt.setString(2,  type);
			
			ResultSet rs = pstmt.executeQuery();
			if(rs.next() && rs.getInt(1) > 0) {
				sent = true;
			} else {
				pstmtDel = sd.prepareStatement(sqlDel);
				pstmtDel.setInt(1, oId);
				pstmtDel.setString(2,  type);
				pstmtDel.executeUpdate();
				
				pstmtAdd = sd.prepareStatement(sqlAdd);
				pstmtAdd.setInt(1, oId);
				pstmtAdd.setString(2,  type);
				pstmtAdd.executeUpdate();
			}
			
		} finally {
			if(pstmt != null) {try {pstmt.close();} catch(Exception e) {}}
			if(pstmtDel != null) {try {pstmtDel.close();} catch(Exception e) {}}
			if(pstmtAdd != null) {try {pstmtAdd.close();} catch(Exception e) {}}
		}
		return sent;
	}
}


